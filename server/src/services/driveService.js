/**
 * Google Drive Download Service
 *
 * Downloads publicly shared files from Google Drive given a share link.
 * Supports multiple Drive URL formats and handles the confirm-download flow
 * that Google uses for large files.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── URL Patterns ─────────────────────────────────────────────────
const DRIVE_PATTERNS = [
  // https://drive.google.com/file/d/{ID}/view?usp=sharing
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  // https://drive.google.com/open?id={ID}
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  // https://docs.google.com/document/d/{ID}/...
  /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  // https://docs.google.com/spreadsheets/d/{ID}/...
  /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  // https://drive.google.com/uc?id={ID}&export=download
  /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
  // https://drive.usercontent.google.com/download?id={ID}
  /drive\.usercontent\.google\.com\/download\?.*id=([a-zA-Z0-9_-]+)/,
];

/**
 * Extract a Google Drive file ID from various URL formats.
 * @param {string} url - The Google Drive share link
 * @returns {string|null} The file ID or null
 */
function extractFileId(url) {
  if (!url || typeof url !== 'string') return null;

  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  // Fallback: bare ID (44-char alphanumeric string)
  const bareId = url.trim().match(/^[a-zA-Z0-9_-]{20,}$/);
  if (bareId) return bareId[0];

  return null;
}

/**
 * Follow redirects and download a URL to a file.
 * Returns a promise that resolves to the file path.
 */
function downloadUrl(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects while downloading from Google Drive'));
    }

    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Handle redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        res.resume(); // drain response
        return downloadUrl(redirectUrl, destPath, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Google Drive returned HTTP ${res.statusCode}. The file may not be publicly shared.`));
      }

      // Check if Google returned an HTML "confirm download" page
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        // Collect the HTML and look for a confirm link
        let html = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { html += chunk; });
        res.on('end', () => {
          // Look for confirm download link
          const confirmMatch = html.match(/href="(\/uc\?export=download[^"]+)"/);
          if (confirmMatch) {
            const confirmUrl = `https://drive.google.com${confirmMatch[1].replace(/&amp;/g, '&')}`;
            return downloadUrl(confirmUrl, destPath, maxRedirects - 1).then(resolve).catch(reject);
          }

          // Check for virus scan warning (large files)
          const formMatch = html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
          if (formMatch) {
            const downloadUrl2 = formMatch[1].replace(/&amp;/g, '&');
            return downloadUrl(downloadUrl2, destPath, maxRedirects - 1).then(resolve).catch(reject);
          }

          // If it's just an error page
          if (html.includes('you need access') || html.includes('Request access') || html.includes('Sign in')) {
            return reject(new Error('This Google Drive file is not publicly shared. Please set sharing to "Anyone with the link can view".'));
          }

          return reject(new Error('Google Drive returned an HTML page instead of a file. The file may not be publicly shared or the link is invalid.'));
        });
        return;
      }

      // It's a real file — pipe to disk
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // cleanup
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Failed to download from Google Drive: ${err.message}`));
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Download from Google Drive timed out (60s)'));
    });
  });
}

/**
 * Detect file extension from the downloaded file (by magic bytes).
 */
function detectExtension(filePath) {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // PDF: starts with %PDF
    if (buffer.toString('ascii', 0, 4) === '%PDF') return '.pdf';

    // DOCX (ZIP): starts with PK\x03\x04
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) return '.docx';

    // Plain text fallback — check if content looks like text
    const sample = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).substring(0, 200);
    if (/^[\x20-\x7E\r\n\t]+$/.test(sample)) return '.txt';

    return null;
  } catch {
    return null;
  }
}

/**
 * Download a file from a Google Drive public link.
 *
 * @param {string} driveUrl - The Google Drive share link
 * @returns {Promise<{filePath: string, originalName: string, extension: string}>}
 */
async function downloadFromDrive(driveUrl) {
  const fileId = extractFileId(driveUrl);
  if (!fileId) {
    throw new Error('Invalid Google Drive link. Please provide a valid Drive share URL.');
  }

  console.log(`📥 Downloading from Google Drive — file ID: ${fileId}`);

  // Build the direct download URL
  const downloadUrlStr = `https://drive.google.com/uc?export=download&id=${fileId}`;

  // Create a temp filename (we'll rename after detecting extension)
  const tempName = `drive-${uuidv4()}`;
  const tempPath = path.join(uploadDir, tempName);

  try {
    await downloadUrl(downloadUrlStr, tempPath);

    // Check file size
    const stats = fs.statSync(tempPath);
    if (stats.size < 100) {
      const content = fs.readFileSync(tempPath, 'utf8');
      fs.unlinkSync(tempPath);
      if (content.includes('not found') || content.includes('404')) {
        throw new Error('File not found on Google Drive. The link may be invalid or the file has been deleted.');
      }
      throw new Error('Downloaded file is too small or empty. The link may be invalid.');
    }

    if (stats.size > 10 * 1024 * 1024) {
      fs.unlinkSync(tempPath);
      throw new Error('File exceeds the 10MB size limit.');
    }

    // Detect extension
    const ext = detectExtension(tempPath);
    if (!ext || !['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
      fs.unlinkSync(tempPath);
      throw new Error('Unsupported file type. Only PDF, DOCX, and TXT resumes are supported.');
    }

    // Rename with proper extension
    const finalName = `${tempName}${ext}`;
    const finalPath = path.join(uploadDir, finalName);
    fs.renameSync(tempPath, finalPath);

    console.log(`✅ Downloaded: ${finalName} (${(stats.size / 1024).toFixed(1)} KB)`);

    return {
      filePath: finalPath,
      originalName: `drive-resume-${fileId.substring(0, 8)}${ext}`,
      extension: ext,
    };
  } catch (error) {
    // Cleanup on error
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    throw error;
  }
}

module.exports = { downloadFromDrive, extractFileId };
