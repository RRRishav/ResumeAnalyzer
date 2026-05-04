const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text content from a resume file (PDF or DOCX)
 */
async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.pdf') {
      text = await parsePDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      text = await parseDOCX(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Clean and normalize the text
    text = cleanText(text);

    if (!text || text.length < 50) {
      throw new Error('Could not extract sufficient text from the resume. The file may be image-based or corrupted.');
    }

    return {
      text,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      fileType: ext.replace('.', ''),
    };
  } catch (error) {
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { parseResume };
