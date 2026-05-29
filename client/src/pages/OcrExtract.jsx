import { useState, useRef, useCallback } from 'react';
import {
  FiAlertTriangle,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiCode,
  FiCpu,
  FiEye,
  FiFileText,
  FiGithub,
  FiGlobe,
  FiImage,
  FiLink,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCcw,
  FiSend,
  FiTerminal,
  FiTool,
  FiTrendingUp,
  FiUploadCloud,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import api from '../services/api';
import './OcrExtract.css';
import './ExtractInfo.css';

export default function OcrExtract() {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [step, setStep] = useState('');   // 'uploading' | 'ocr' | 'merging'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('beautiful'); // 'beautiful' | 'raw'
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext)) {
      setError(`Unsupported file: .${ext}. Use PDF, DOCX, TXT, or images.`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB.');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    setError('');
    setResult(null);
    setExtracting(true);
    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      setStep('ocr');
      const res = await api.post('/extract/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      if (res.data.success) {
        setResult(res.data.extraction);
        setStep('done');
      } else {
        throw new Error(res.data.error || 'Extraction failed');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'OCR extraction failed';
      setError(msg);
      setStep('');
    } finally {
      setExtracting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setStep('');
    setViewMode('beautiful');
  };

  const data = result?.extracted_data || {};

  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Syntax-highlighted JSON
  const renderJson = (obj) => {
    const jsonStr = JSON.stringify(obj, null, 2);
    const highlighted = jsonStr
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>');
    return <pre dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const educationItems = data.education?.length
    ? data.education
    : (data.degree || data.stream || data.cgpa)
      ? [{ degree: data.degree || 'Education', institution: null, stream: data.stream, score: data.cgpa, duration: null }]
      : [];

  return (
    <div className="ocr-page">
      <div className="container">
        {/* Header */}
        <div className="ocr-header animate-fade-in-up">
          <div className="ocr-header-row">
            <Badge variant="default"><FiCpu /> OCR Extract</Badge>
          </div>
          <div className="ocr-icon-box">
            <FiImage size={24} style={{ color: '#a78bfa' }} />
          </div>
          <h1>Resume <span className="text-gradient">OCR Extract</span></h1>
          <p>Upload your resume — Groq Vision AI reads the document like a human and extracts every important detail, even from scanned PDFs.</p>
        </div>

        {/* Upload / Processing / Results */}
        {!result ? (
          <Card className="ocr-upload-card animate-fade-in-up stagger-1">
            {!extracting ? (
              <>
                {/* Dropzone */}
                <div
                  className={`ocr-dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div className="ocr-dropzone-icon">
                    <FiUploadCloud size={24} />
                  </div>
                  <h3>{file ? 'File selected' : 'Drop your resume here'}</h3>
                  <p>{file ? '' : 'or click to browse — PDF, DOCX, TXT, images'}</p>

                  {file && (
                    <div className="ocr-file-badge">
                      <FiFileText size={14} />
                      {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                        <FiX size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="ocr-error">
                    <FiAlertTriangle size={15} /> {error}
                  </div>
                )}

                <Button
                  size="lg"
                  className="ocr-submit-btn"
                  onClick={handleExtract}
                  disabled={!file}
                >
                  <FiCpu /> Extract with Vision OCR
                </Button>
              </>
            ) : (
              /* Processing animation */
              <div className="ocr-processing">
                <div className="ocr-spinner" />
                <h3>Extracting resume data...</h3>
                <p>Groq Vision AI is reading your document</p>
                <div className="ocr-step-list">
                  <div className={`ocr-step ${step === 'uploading' ? 'active' : (step !== 'uploading' ? 'done' : '')}`}>
                    <FiCheckCircle size={14} /> Uploading file
                  </div>
                  <div className={`ocr-step ${step === 'ocr' ? 'active' : (step === 'done' ? 'done' : '')}`}>
                    <FiImage size={14} /> OCR processing pages
                  </div>
                  <div className={`ocr-step ${step === 'done' ? 'done' : ''}`}>
                    <FiCpu size={14} /> Extracting details
                  </div>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="ocr-results">
            {/* Hero */}
            <Card className="ocr-hero ocr-fade-in d1">
              <Badge variant="success"><FiCheckCircle /> OCR Extraction Complete</Badge>
              <h2>{data.name || result.filename}</h2>
              <p>Extracted via <strong>Groq Vision OCR</strong> · {result.model_used} · {result.pages_processed} page(s)</p>

              <div className="ocr-hero-actions">
                <Button onClick={handleReset}><FiRefreshCcw /> Extract Another</Button>
                <div className="ocr-view-toggle">
                  <button
                    className={`ocr-view-btn ${viewMode === 'beautiful' ? 'active' : ''}`}
                    onClick={() => setViewMode('beautiful')}
                  >
                    <FiEye size={13} /> Beautiful
                  </button>
                  <button
                    className={`ocr-view-btn ${viewMode === 'raw' ? 'active' : ''}`}
                    onClick={() => setViewMode('raw')}
                  >
                    <FiTerminal size={13} /> Raw JSON
                  </button>
                </div>
              </div>

              <div className="ocr-meta-row">
                <div className="ocr-meta-chip">
                  <span>Method</span>
                  <strong>{result.method === 'vision_ocr' ? '🔍 Vision OCR' : '📝 Text'}</strong>
                </div>
                <div className="ocr-meta-chip">
                  <span>Model</span>
                  <strong>{result.model_used}</strong>
                </div>
                <div className="ocr-meta-chip">
                  <span>Time</span>
                  <strong>{formatTime(result.processing_time_ms)}</strong>
                </div>
                <div className="ocr-meta-chip">
                  <span>Pages</span>
                  <strong>{result.pages_processed}</strong>
                </div>
              </div>
            </Card>

            {/* View: Raw JSON */}
            {viewMode === 'raw' && (
              <Card className="ocr-raw-json ocr-fade-in d2">
                {renderJson(data)}
              </Card>
            )}

            {/* View: Beautiful */}
            {viewMode === 'beautiful' && (
              <div className="extract-grid">
                {/* Summary */}
                <Card className="extract-section summary-section extract-grid-full ocr-fade-in d2">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiFileText /></div>
                    Professional Summary
                  </div>
                  {data.professional_summary ? (
                    <p className="extract-summary-text">{data.professional_summary}</p>
                  ) : (
                    <div className="extract-empty">No professional summary found</div>
                  )}
                </Card>

                {/* Suggested Roles */}
                <Card className="extract-section roles-section extract-grid-full ocr-fade-in d2">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTrendingUp style={{ color: '#10b981' }} /></div>
                    Suggested Roles / Career Matches
                  </div>
                  {data.suggested_roles?.length > 0 ? (
                    <div className="suggested-roles-container">
                      <p className="suggested-roles-intro">Based on your skills, experience, and projects, our AI suggests that you are a strong fit for the following target roles:</p>
                      <div className="extract-skills-grid">
                        {data.suggested_roles.map((role, i) => (
                          <span key={i} className="extract-skill-tag role-tag">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="extract-empty">No role recommendations available</div>
                  )}
                </Card>

                {/* Personal Info */}
                <Card className="extract-section personal ocr-fade-in d2">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiUser /></div>
                    Personal Information
                  </div>
                  <div className="personal-info-grid">
                    {data.name && (
                      <div className="personal-info-row">
                        <FiUser size={14} />
                        <span className="personal-info-label">Name</span>
                        <span className="personal-info-value">{data.name}</span>
                      </div>
                    )}
                    {data.phone && (
                      <div className="personal-info-row">
                        <FiPhone size={14} />
                        <span className="personal-info-label">Phone</span>
                        <span className="personal-info-value">{Array.isArray(data.phone) ? data.phone.join(', ') : data.phone}</span>
                      </div>
                    )}
                    {data.email && (
                      <div className="personal-info-row">
                        <FiMail size={14} />
                        <span className="personal-info-label">Email</span>
                        <span className="personal-info-value">
                          <a href={`mailto:${Array.isArray(data.email) ? data.email[0] : data.email}`}>
                            {Array.isArray(data.email) ? data.email.join(', ') : data.email}
                          </a>
                        </span>
                      </div>
                    )}
                    {data.location && (
                      <div className="personal-info-row">
                        <FiMapPin size={14} />
                        <span className="personal-info-label">Location</span>
                        <span className="personal-info-value">{data.location}</span>
                      </div>
                    )}
                    {data.links?.github && (
                      <div className="personal-info-row">
                        <FiGithub size={14} />
                        <span className="personal-info-label">GitHub</span>
                        <span className="personal-info-value">
                          <a href={data.links.github} target="_blank" rel="noreferrer">{data.links.github}</a>
                        </span>
                      </div>
                    )}
                    {data.links?.linkedin && (
                      <div className="personal-info-row">
                        <FiLinkedin size={14} />
                        <span className="personal-info-label">LinkedIn</span>
                        <span className="personal-info-value">
                          <a href={data.links.linkedin} target="_blank" rel="noreferrer">{data.links.linkedin}</a>
                        </span>
                      </div>
                    )}
                    {data.links?.portfolio && (
                      <div className="personal-info-row">
                        <FiGlobe size={14} />
                        <span className="personal-info-label">Portfolio</span>
                        <span className="personal-info-value">
                          <a href={data.links.portfolio} target="_blank" rel="noreferrer">{data.links.portfolio}</a>
                        </span>
                      </div>
                    )}
                    {!data.name && !data.phone && !data.email && !data.location && (
                      <div className="extract-empty">No personal information found</div>
                    )}
                  </div>
                </Card>

                {/* Education */}
                <Card className="extract-section education ocr-fade-in d3">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiBookOpen /></div>
                    Education
                  </div>
                  {educationItems.length > 0 ? (
                    <div className="extract-timeline">
                      {educationItems.map((edu, i) => (
                        <div key={i} className="extract-timeline-card">
                          <div className="extract-timeline-title">{edu.degree || 'Education'}</div>
                          {edu.institution && <div className="extract-timeline-subtitle">{edu.institution}</div>}
                          <div className="extract-mini-tags">
                            {edu.stream && <span>{edu.stream}</span>}
                            {edu.score && <span>{edu.score}</span>}
                            {edu.duration && <span>{edu.duration}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="extract-empty">No education found</div>
                  )}
                  <div className="education-grid education-score-grid">
                    {[
                      ['10th', data.tenth_marks],
                      ['12th', data.twelfth_marks],
                      ['Degree', data.degree],
                      ['Stream', data.stream],
                      ['CGPA', data.cgpa],
                    ].map(([label, val]) => (
                      <div key={label} className="education-item">
                        <div className="education-item-label">{label}</div>
                        <div className={`education-item-value ${!val ? 'empty' : ''}`}>{val || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Skills */}
                <Card className="extract-section skills-section ocr-fade-in d4">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTool /></div>
                    Skills
                    {data.skills?.length > 0 && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{data.skills.length} found</Badge>
                    )}
                  </div>
                  {data.skills?.length > 0 ? (
                    <div className="extract-skills-grid">
                      {data.skills.map((s, i) => <span key={i} className="extract-skill-tag">{s}</span>)}
                    </div>
                  ) : (
                    <div className="extract-empty">No skills found</div>
                  )}
                </Card>

                {/* Certifications */}
                <Card className="extract-section certs-section ocr-fade-in d5">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiAward /></div>
                    Certifications
                  </div>
                  {data.certifications?.length > 0 ? (
                    data.certifications.map((c, i) => (
                      <div key={i} className="extract-cert-card">
                        <div className="extract-cert-icon"><FiAward size={16} /></div>
                        <div className="extract-cert-info">
                          <div className="extract-cert-name">{c.name}</div>
                          <div className="extract-cert-meta">
                            {c.issuer && <span>{c.issuer}</span>}
                            {c.issuer && c.year && <span> · </span>}
                            {c.year && <span>{c.year}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="extract-empty">No certifications found</div>
                  )}
                </Card>

                {/* Achievements */}
                <Card className="extract-section achievements-section ocr-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTrendingUp /></div>
                    Achievements
                  </div>
                  {data.achievements?.length > 0 ? (
                    <ul className="extract-bullet-list">
                      {data.achievements.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  ) : (
                    <div className="extract-empty">No achievements found</div>
                  )}
                </Card>

                {/* Languages */}
                <Card className="extract-section languages-section ocr-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiGlobe /></div>
                    Languages
                  </div>
                  {data.languages?.length > 0 ? (
                    <div className="extract-skills-grid">
                      {data.languages.map((l, i) => <span key={i} className="extract-language-tag">{l}</span>)}
                    </div>
                  ) : (
                    <div className="extract-empty">No languages found</div>
                  )}
                </Card>

                {/* Projects */}
                <Card className="extract-section projects-section extract-grid-full ocr-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiCode /></div>
                    Projects
                    {data.projects?.length > 0 && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{data.projects.length}</Badge>
                    )}
                  </div>
                  {data.projects?.length > 0 ? (
                    data.projects.map((p, i) => (
                      <div key={i} className="extract-project-card">
                        <div className="extract-project-title">{p.title}</div>
                        {p.description && <div className="extract-project-desc">{p.description}</div>}
                        {p.tech_stack?.length > 0 && (
                          <div className="extract-project-tech">
                            {p.tech_stack.map((t, j) => <span key={j}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="extract-empty">No projects found</div>
                  )}
                </Card>

                {/* Experience */}
                <Card className="extract-section experience-section extract-grid-full ocr-fade-in d7">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiBriefcase /></div>
                    Work Experience
                    {data.total_experience && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{data.total_experience}</Badge>
                    )}
                  </div>
                  {data.experience?.length > 0 ? (
                    <div className="extract-exp-timeline">
                      {data.experience.map((exp, i) => (
                        <div key={i} className="extract-exp-item">
                          <div className="extract-exp-role">{exp.role}</div>
                          {exp.company && <div className="extract-exp-company">{exp.company}</div>}
                          {exp.duration && <div className="extract-exp-duration">{exp.duration}</div>}
                          {exp.description && <div className="extract-exp-desc">{exp.description}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="extract-empty">No work experience found</div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
