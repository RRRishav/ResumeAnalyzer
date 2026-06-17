import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiCloud,
  FiCode,
  FiCpu,
  FiDatabase,
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
  FiServer,
  FiStar,
  FiTerminal,
  FiTool,
  FiTrendingUp,
  FiUploadCloud,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import ProgressBar from '../components/ProgressBar';
import { CareerRecommendationsSection, SuggestedRolesSection } from '../components/CareerSuggestionSections';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import './ExtractInfo.css';

const PRODUCTION_SOCKET_URL = 'https://resume-analyzer-api-12if.onrender.com';
const getSocketURL = () => {
  if (import.meta.env.DEV) return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  return import.meta.env.VITE_SOCKET_URL || PRODUCTION_SOCKET_URL;
};

const STANDARD_EXTS = ['pdf', 'docx', 'doc', 'txt'];
const OCR_EXTS = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'];

const flattenSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  return Object.values(skills).flatMap((list) => Array.isArray(list) ? list : []).filter(Boolean);
};

const inferSuggestedRoles = (data) => {
  const existing = Array.isArray(data.suggested_roles) ? data.suggested_roles.filter(Boolean) : [];
  if (existing.length) return existing;

  const text = [
    ...flattenSkills(data.skills),
    data.degree,
    data.stream,
    data.total_experience,
  ].filter(Boolean).join(' ').toLowerCase();

  const roles = [];
  const add = (role) => {
    if (!roles.includes(role)) roles.push(role);
  };

  if (/react|javascript|typescript|html|css|tailwind|frontend|front end|ui/.test(text)) add('Frontend Developer');
  if (/node|express|api|mongodb|sql|postgres|mysql|backend|server/.test(text)) add('Backend Developer');
  if (/python|machine learning|ml|data|pandas|numpy|tensorflow|power bi|tableau/.test(text)) add('Data Analyst');
  if (/java|spring|c\+\+|c#|software|programming|computer science|cse|it/.test(text)) add('Software Engineer');
  if (/aws|azure|gcp|docker|kubernetes|devops|ci\/cd|linux/.test(text)) add('DevOps Engineer');

  if (!roles.length) {
    add('Software Engineer');
    add('Frontend Developer');
    add('Data Analyst');
  }

  return roles.slice(0, 4);
};

const inferCareerRecommendations = (data, roles) => {
  const existing = Array.isArray(data.career_recommendations) ? data.career_recommendations.filter(Boolean) : [];
  if (existing.length) return existing;

  return roles.slice(0, 3).map((role, index) => ({
    role,
    match_score: 85 - (index * 5),
    reason: 'Based on extracted skills and education',
  }));
};

export default function ExtractInfo() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  /* ── mode: 'standard' | 'ocr' ── */
  const [mode, setMode] = useState('standard');

  /* ── file state ── */
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  /* ── processing state ── */
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [ocrStep, setOcrStep] = useState('');

  /* ── result state ── */
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('beautiful'); // 'beautiful' | 'raw'
  const [showSuggested, setShowSuggested] = useState(false);

  /* ── LLM health (standard mode) ── */
  const [llmStatus, setLlmStatus] = useState('checking');
  const [llmModel, setLlmModel] = useState('');
  const [llmProvider, setLlmProvider] = useState('');
  const socketRef = useRef(null);

  /* ── Socket.IO setup ── */
  useEffect(() => {
    checkLLM();
    const socket = io(getSocketURL(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });
    socketRef.current = socket;
    socket.on('extract_progress', (data) => setProgress(data));
    return () => socket.disconnect();
  }, []);

  const checkLLM = async () => {
    setLlmStatus('checking');
    try {
      const res = await api.get('/extract/health');
      if (res.data.healthy) {
        setLlmStatus('online');
        setLlmModel(res.data.model || '');
        setLlmProvider(res.data.provider || '');
      } else {
        setLlmStatus('offline');
      }
    } catch {
      setLlmStatus('offline');
    }
  };

  /* ── File handling ── */
  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    const allowed = mode === 'ocr' ? OCR_EXTS : STANDARD_EXTS;
    if (!allowed.includes(ext)) {
      setError(`Unsupported file: .${ext}. ${mode === 'ocr' ? 'Use PDF, DOCX, TXT, PNG, or JPG.' : 'Use PDF, DOCX, or TXT.'}`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10 MB.');
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  }, [mode]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  /* ── Extraction ── */
  const handleExtract = async () => {
    if (!file) return;
    setError('');
    setResult(null);
    setExtracting(true);
    toast.info('Extraction started — processing your resume…', 3000);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      if (mode === 'standard') {
        setProgress({ stage: 'parsing', progress: 5, message: 'Starting extraction…' });
        const res = await api.post('/extract/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-socket-id': socketRef.current?.id || '',
          },
          timeout: 180000,
        });
        setResult({ ...res.data.extraction, _mode: 'standard' });
        setProgress({ stage: 'complete', progress: 100, message: 'Extraction complete!' });
        refreshUser();
        toast.success('Extraction complete!', 4000);
      } else {
        /* OCR mode */
        setOcrStep('uploading');
        const res = await api.post('/extract/ocr', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
        });
        if (!res.data.success) throw new Error(res.data.error || 'OCR extraction failed');
        setResult({ ...res.data.extraction, _mode: 'ocr' });
        setOcrStep('done');
        toast.success('OCR Extraction complete!', 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Extraction failed.';
      setError(msg);
      setProgress({ stage: '', progress: 0, message: '' });
      setOcrStep('');
      toast.error(msg, 6000);
    } finally {
      setExtracting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress({ stage: '', progress: 0, message: '' });
    setOcrStep('');
    setViewMode('beautiful');
    setShowSuggested(false);
  };

  /* ── Derived data ── */
  const data = result?.extracted_data || {};
  const isOcrResult = result?._mode === 'ocr';
  const suggestedRoles = inferSuggestedRoles(data);
  const careerRecommendations = inferCareerRecommendations(data, suggestedRoles);

  const educationItems = data.education?.length
    ? data.education
    : (data.degree || data.stream || data.cgpa || data.tenth_marks || data.twelfth_marks)
      ? [{ degree: data.degree || 'Education', institution: null, stream: data.stream, score: data.cgpa, duration: null }]
      : [];

  const totalSkillsCount = data.skills
    ? (Array.isArray(data.skills)
        ? data.skills.length
        : Object.values(data.skills).reduce((a, c) => a + (Array.isArray(c) ? c.length : 0), 0))
    : 0;

  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const isCloud = llmProvider?.toLowerCase().includes('groq') || llmProvider?.toLowerCase().includes('cloud');
  const providerIcon = isCloud ? <FiCloud size={13} /> : <FiServer size={13} />;
  const providerLabel = llmProvider || (isCloud ? 'Groq Cloud' : 'Ollama Local');

  /* ── JSON highlight ── */
  const renderJson = (obj) => {
    const s = JSON.stringify(obj, null, 2)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: null/g, ': <span class="json-null">null</span>');
    return <pre className="json-viewer" dangerouslySetInnerHTML={{ __html: s }} />;
  };

  /* ─────────────────────────────────────────── RENDER ── */
  return (
    <div className="extract-page">
      <div className="container">

        {/* ── Header ── */}
        <div className="extract-header animate-fade-in-up">
          <div className="extract-header-row">
            <Badge variant="default"><FiDatabase /> AI Extract</Badge>
            {mode === 'standard' && (
              <div className={`ollama-status ${llmStatus}`}>
                <span className="ollama-status-dot" />
                {llmStatus === 'checking' && 'Checking LLM…'}
                {llmStatus === 'online' && (
                  <span className="flex items-center gap-1.5">
                    {providerIcon} {providerLabel}{llmModel ? ` · ${llmModel}` : ''}
                  </span>
                )}
                {llmStatus === 'offline' && 'LLM Offline'}
              </div>
            )}
          </div>
          <h1>Extract <span className="text-gradient">Resume Info</span></h1>
          <p>Upload your resume and let AI extract every detail — structured, anonymized, and ready to review.</p>

          {/* ── Mode Toggle ── */}
          <div className="extract-mode-toggle">
            <button
              className={`mode-btn ${mode === 'standard' ? 'active' : ''}`}
              onClick={() => { setMode('standard'); setFile(null); setError(''); setResult(null); }}
            >
              <FiFileText size={14} /> Standard (PDF / DOCX)
            </button>
            <button
              className={`mode-btn ${mode === 'ocr' ? 'active' : ''}`}
              onClick={() => { setMode('ocr'); setFile(null); setError(''); setResult(null); }}
            >
              <FiImage size={14} /> Vision OCR (Images / Scanned)
            </button>
          </div>
        </div>

        {/* ── Upload / Processing / Results ── */}
        {!result ? (
          <Card className="extract-upload-section animate-fade-in-up stagger-1">

            {/* Dropzone */}
            {!extracting ? (
              <>
                <div
                  className={`unified-dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept={mode === 'ocr' ? '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg' : '.pdf,.docx,.doc,.txt'}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div className="dropzone-icon-wrap">
                    {mode === 'ocr' ? <FiImage size={26} /> : <FiUploadCloud size={26} />}
                  </div>
                  <h3>{file ? 'File selected' : (mode === 'ocr' ? 'Drop your resume or image here' : 'Drop your resume here')}</h3>
                  <p>
                    {file
                      ? ''
                      : mode === 'ocr'
                        ? 'or click to browse — PDF, DOCX, TXT, PNG, JPG (max 10 MB)'
                        : 'or click to browse — PDF, DOCX, or TXT (max 10 MB)'}
                  </p>
                  {file && (
                    <div className="dropzone-file-badge">
                      <FiFileText size={14} />
                      {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                        <FiX size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="extract-error animate-fade-in">
                    <FiAlertTriangle /> {error}
                  </div>
                )}

                <Button
                  size="lg"
                  className="extract-submit"
                  onClick={handleExtract}
                  disabled={!file || extracting || (mode === 'standard' && llmStatus === 'offline')}
                >
                  {mode === 'ocr' ? <><FiCpu /> Extract with Vision OCR</> : <><FiSend /> Extract Resume</>}
                </Button>

                {mode === 'standard' && llmStatus === 'offline' && (
                  <div className="extract-error" style={{ marginTop: '0.75rem' }}>
                    <FiAlertTriangle />
                    LLM service unavailable — please retry in a moment.
                    <Button size="sm" variant="outline" onClick={checkLLM} style={{ marginLeft: 'auto' }}>
                      <FiRefreshCcw size={14} /> Retry
                    </Button>
                  </div>
                )}
              </>
            ) : mode === 'standard' ? (
              /* Standard: socket-driven progress bar */
              <ProgressBar stage={progress.stage} progress={progress.progress} message={progress.message} />
            ) : (
              /* OCR: step-indicator */
              <div className="ocr-processing">
                <div className="ocr-spinner" />
                <h3>Extracting resume data…</h3>
                <p>Groq Vision AI is reading your document</p>
                <div className="ocr-step-list">
                  {[
                    { key: 'uploading', icon: <FiCheckCircle size={14} />, label: 'Uploading file' },
                    { key: 'ocr',      icon: <FiImage size={14} />,        label: 'OCR processing' },
                    { key: 'done',     icon: <FiCpu size={14} />,          label: 'Extracting details' },
                  ].map(({ key, icon, label }) => (
                    <div
                      key={key}
                      className={`ocr-step ${ocrStep === key ? 'active' : (ocrStep === 'done' || (key === 'uploading' && ocrStep !== '')) ? 'done' : ''}`}
                    >
                      {icon} {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="extract-results">

            {/* ── Result Hero ── */}
            <Card className="extract-result-hero extract-fade-in d1">
              <div>
                <Badge variant="success"><FiCheckCircle /> Extraction Complete</Badge>
                <h2>{result.filename}</h2>
                <p>
                  Extracted via <strong>{isOcrResult ? 'Groq Vision OCR' : (result.provider_used === 'groq' ? 'Groq Cloud' : 'Local Parser')}</strong>
                  {result.model_used ? ` · ${result.model_used}` : ''}
                  {isOcrResult && result.pages_processed ? ` · ${result.pages_processed} page(s)` : ''}
                </p>
                <div className="extract-result-actions">
                  <Button onClick={handleReset}><FiRefreshCcw /> Extract Another</Button>
                  {!isOcrResult && result.id && (
                    <Button variant="outline" onClick={() => navigate(`/extract-detail/${result.id}`)}>
                      Full View <FiZap size={14} />
                    </Button>
                  )}
                  {/* View toggle */}
                  <div className="ocr-view-toggle" style={{ marginLeft: 'auto' }}>
                    <button className={`ocr-view-btn ${viewMode === 'beautiful' ? 'active' : ''}`} onClick={() => setViewMode('beautiful')}>
                      <FiEye size={13} /> Formatted
                    </button>
                    <button className={`ocr-view-btn ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => setViewMode('raw')}>
                      <FiTerminal size={13} /> Raw JSON
                    </button>
                  </div>
                </div>
              </div>
              <div className="extract-result-meta">
                {[
                  { label: 'Provider',    val: isOcrResult ? 'Groq OCR' : (result.provider_used === 'groq' ? 'Groq' : 'Local') },
                  { label: 'Model',       val: result.model_used || '—' },
                  { label: 'Time',        val: formatTime(result.processing_time_ms) },
                  { label: 'Words',       val: result.word_count || '—' },
                  { label: 'Experience',  val: data.total_experience || 'N/A' },
                ].map(({ label, val }) => (
                  <div className="extract-meta-item" key={label}>
                    <span>{label}</span>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Raw JSON view ── */}
            {viewMode === 'raw' && (
              <Card className="ocr-raw-json extract-fade-in d2">
                {renderJson(data)}
              </Card>
            )}

            {/* ── Beautiful view ── */}
            {viewMode === 'beautiful' && (
              <div className="extract-grid">

                {/* Professional Summary */}
                {data.professional_summary && (
                  <Card className="extract-section summary-section extract-grid-full extract-fade-in d2">
                    <div className="extract-section-title">
                      <div className="extract-section-icon"><FiFileText /></div>
                      Professional Summary
                    </div>
                    <p className="extract-summary-text">{data.professional_summary}</p>
                  </Card>
                )}

                <CareerRecommendationsSection
                  recommendations={careerRecommendations}
                  fallbackRoles={suggestedRoles}
                />

                <SuggestedRolesSection
                  roles={suggestedRoles}
                  show={showSuggested}
                  onToggle={() => setShowSuggested(!showSuggested)}
                />

                {/* Education */}
                <Card className="extract-section education extract-fade-in d3">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiBookOpen /></div>
                    Education
                  </div>
                  {educationItems.length > 0 ? (
                    <div className="extract-timeline">
                      {educationItems.map((edu, i) => (
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
                    <div className="extract-empty">No education details found</div>
                  )}
                  <div className="education-grid education-score-grid">
                    {[
                      ['10th Marks', data.tenth_marks],
                      ['12th Marks', data.twelfth_marks],
                      ['Degree', data.degree],
                      ['Stream', data.stream],
                      ['CGPA / %', data.cgpa],
                    ].map(([label, val]) => (
                      <div className="education-item" key={label}>
                        <div className="education-item-label">{label}</div>
                        <div className={`education-item-value ${!val ? 'empty' : ''}`}>{val || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Skills */}
                <Card className="extract-section skills-section extract-fade-in d4">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTool /></div>
                    Skills
                    {totalSkillsCount > 0 && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{totalSkillsCount} found</Badge>
                    )}
                  </div>
                  {totalSkillsCount === 0
                    ? <div className="extract-empty">No skills found</div>
                    : Array.isArray(data.skills)
                      ? <div className="extract-skills-grid">{data.skills.map((s, i) => <span key={i} className="extract-skill-tag">{s}</span>)}</div>
                      : (
                        <div className="extract-skills-categories">
                          {Object.entries(data.skills).map(([cat, list]) => (
                            <div key={cat} className="extract-skill-category-group">
                              <h4 className="skill-category-title">{cat}</h4>
                              <div className="extract-skills-grid">
                                {Array.isArray(list) && list.map((s, i) => <span key={i} className="extract-skill-tag">{s}</span>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                </Card>

                {/* Certifications */}
                <Card className="extract-section certs-section extract-fade-in d5">
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
                <Card className="extract-section achievements-section extract-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiTrendingUp /></div>
                    Achievements &amp; Awards
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
                <Card className="extract-section languages-section extract-fade-in d6">
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
                <Card className="extract-section projects-section extract-grid-full extract-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiCode /></div>
                    Projects
                    {data.projects?.length > 0 && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{data.projects.length} projects</Badge>
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
                <Card className="extract-section experience-section extract-grid-full extract-fade-in d7">
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
