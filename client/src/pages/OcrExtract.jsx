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
  FiStar,
} from 'react-icons/fi';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { SuggestedRolesSection } from '../components/CareerSuggestionSections';
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
  const [rolesLoading, setRolesLoading] = useState(false);
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
    setRolesLoading(false);
  };

  const handleSuggestRoles = async () => {
    if (!result?.id) return;
    setRolesLoading(true);
    try {
      const res = await api.post(`/extract/suggest-roles/${result.id}`);
      setResult(prev => ({
        ...prev,
        extracted_data: {
          ...(prev.extracted_data || {}),
          suggested_roles: res.data.suggested_roles
        }
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setRolesLoading(false);
    }
  };

  const data = result?.extracted_data || {};

  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const parseDate = (str) => {
    if (!str || str.toLowerCase().includes('present')) return new Date();
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const calculateDuration = (durationStr) => {
    if (!durationStr) return '';
    const parts = durationStr.split(/[-–—]/).map(s => s.trim());
    if (parts.length === 2) {
      const start = parseDate(parts[0]);
      const end = parseDate(parts[1]);
      if (start && end) {
        let diff = (end.getFullYear() - start.getFullYear()) * 12;
        diff -= start.getMonth();
        diff += end.getMonth();
        diff += 1;
        if (diff <= 0) return '';
        const yrs = Math.floor(diff / 12);
        const mos = diff % 12;
        if (yrs > 0 && mos > 0) return `${yrs} yr${yrs > 1 ? 's' : ''} ${mos} mo${mos > 1 ? 's' : ''}`;
        if (yrs > 0) return `${yrs} yr${yrs > 1 ? 's' : ''}`;
        return `${mos} mo${mos > 1 ? 's' : ''}`;
      }
    }
    return '';
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

  const experiences = data.experience || [];
  const internships = experiences.filter(exp => (exp.role || '').toLowerCase().includes('intern') || (exp.description || '').toLowerCase().includes('internship'));
  const fullTime = experiences.filter(exp => !((exp.role || '').toLowerCase().includes('intern') || (exp.description || '').toLowerCase().includes('internship')));

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
                {data.professional_summary && (
                  <Card className="extract-section summary-section extract-grid-full ocr-fade-in d2">
                    <div className="extract-section-title">
                      <div className="extract-section-icon"><FiFileText /></div>
                      Professional Summary
                    </div>
                    <p className="extract-summary-text">{data.professional_summary}</p>
                  </Card>
                )}

                <SuggestedRolesSection
                  roles={data.suggested_roles || []}
                  isLoading={rolesLoading}
                  onFetch={handleSuggestRoles}
                  animationClass="ocr-fade-in d2"
                />

                {/* Education */}
                <Card className="extract-section education ocr-fade-in d3">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiBookOpen /></div>
                    Education
                  </div>
                  {data.education?.length > 0 ? (
                    <div className="extract-timeline">
                      {data.education.map((edu, i) => (
                        <div key={i} className="extract-timeline-card">
                          <div className="extract-timeline-title">{edu.degree || 'Education'}</div>
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
                </Card>

                {/* Skills */}
                <Card className="extract-section skills-section ocr-fade-in d4">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTool /></div>
                    Skills
                    {(() => {
                      const totalSkillsCount = data.skills
                        ? (Array.isArray(data.skills)
                            ? data.skills.length
                            : Object.values(data.skills).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0))
                        : 0;
                      return totalSkillsCount > 0 && (
                        <Badge variant="muted" style={{ marginLeft: 'auto' }}>{totalSkillsCount} found</Badge>
                      );
                    })()}
                  </div>
                  {(() => {
                    const totalSkillsCount = data.skills
                      ? (Array.isArray(data.skills)
                          ? data.skills.length
                          : Object.values(data.skills).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0))
                      : 0;

                    if (totalSkillsCount === 0) {
                      return <div className="extract-empty">No skills found</div>;
                    }

                    if (Array.isArray(data.skills)) {
                      return (
                        <div className="extract-skills-grid">
                          {data.skills.map((skill, i) => (
                            <span key={i} className="extract-skill-tag">{skill}</span>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="extract-skills-categories">
                        {Object.entries(data.skills).map(([category, skillList]) => (
                          <div key={category} className="extract-skill-category-group">
                            <h4 className="skill-category-title">{category}</h4>
                            <div className="extract-skills-grid">
                              {Array.isArray(skillList) && skillList.map((skill, i) => (
                                <span key={i} className="extract-skill-tag">{skill}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
                  {fullTime.length > 0 && (
                    <>
                      <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', marginTop: '1rem' }}>Full Time Experience</h4>
                      <div className="extract-exp-timeline">
                        {fullTime.map((exp, i) => {
                          const durationStr = calculateDuration(exp.duration);
                          return (
                            <div key={`ft-${i}`} className="extract-exp-item" style={{ position: 'relative' }}>
                              <div className="extract-exp-role">{exp.role}</div>
                              {durationStr && <div style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '0.85rem', color: '#a0a0b8', fontWeight: 500 }}>{durationStr}</div>}
                              {exp.company && <div className="extract-exp-company">{exp.company}</div>}
                              {exp.duration && <div className="extract-exp-duration">{exp.duration}</div>}
                              {exp.description && <div className="extract-exp-desc">{exp.description}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {internships.length > 0 && (
                    <>
                      <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem', marginTop: '2rem' }}>Internship Experience</h4>
                      <div className="extract-exp-timeline">
                        {internships.map((exp, i) => {
                          const durationStr = calculateDuration(exp.duration);
                          return (
                            <div key={`int-${i}`} className="extract-exp-item" style={{ position: 'relative' }}>
                              <div className="extract-exp-role">{exp.role}</div>
                              {durationStr && <div style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '0.85rem', color: '#a0a0b8', fontWeight: 500 }}>{durationStr}</div>}
                              {exp.company && <div className="extract-exp-company">{exp.company}</div>}
                              {exp.duration && <div className="extract-exp-duration">{exp.duration}</div>}
                              {exp.description && <div className="extract-exp-desc">{exp.description}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {experiences.length === 0 && (
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
