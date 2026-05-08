import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCpu,
  FiDatabase,
  FiExternalLink,
  FiGithub,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiRefreshCcw,
  FiSend,
  FiStar,
  FiTool,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiGlobe,
  FiArrowRight,
  FiCode,
  FiLink,
  FiCloud,
  FiServer,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import './ExtractInfo.css';

const PRODUCTION_SOCKET_URL = 'https://resume-analyzer-api-12if.onrender.com';

const getSocketURL = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }
  return import.meta.env.VITE_SOCKET_URL || PRODUCTION_SOCKET_URL;
};

export default function ExtractInfo() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [llmStatus, setLlmStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [llmModel, setLlmModel] = useState('');
  const [llmProvider, setLlmProvider] = useState(''); // 'Ollama (Local)' | 'Groq Cloud (Llama)'
  const socketRef = useRef(null);

  // Check LLM health on mount
  useEffect(() => {
    checkLLM();
  }, []);

  // Socket.io setup
  useEffect(() => {
    const socket = io(getSocketURL(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });
    socketRef.current = socket;

    socket.on('extract_progress', (data) => {
      setProgress(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const checkLLM = async () => {
    setLlmStatus('checking');
    try {
      const res = await api.get('/extract/health');
      if (res.data.healthy) {
        setLlmStatus('online');
        setLlmModel(res.data.model || '');
        setLlmProvider(res.data.provider || '');
        toast.success(`LLM connected — ${res.data.provider || 'Ready'}`, 3000);
      } else {
        setLlmStatus('offline');
        toast.warning('No LLM provider available. Check Ollama or Groq config.', 5000);
      }
    } catch {
      setLlmStatus('offline');
      toast.error('Could not reach LLM health endpoint', 4000);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setError('');
    setResult(null);
    setExtracting(true);
    setProgress({ stage: 'parsing', progress: 5, message: 'Starting extraction...' });
    toast.info('Extraction started — processing your resume...', 3000);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await api.post('/extract/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-socket-id': socketRef.current?.id || '',
        },
        timeout: 180000, // 3 min timeout for local LLM
      });

      setResult(res.data.extraction);
      setProgress({ stage: 'complete', progress: 100, message: 'Extraction complete!' });
      refreshUser();
      toast.success(`Extraction complete via ${res.data.extraction?.provider_used || 'AI'} — ${res.data.extraction?.model_used || ''}`, 5000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Extraction failed. Make sure an LLM provider is available.';
      setError(msg);
      setProgress({ stage: '', progress: 0, message: '' });
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
  };

  const data = result?.extracted_data || {};

  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Determine provider icon and label
  const isCloud = llmProvider?.toLowerCase().includes('groq') || llmProvider?.toLowerCase().includes('cloud');
  const providerIcon = isCloud ? <FiCloud size={13} /> : <FiServer size={13} />;
  const providerLabel = llmProvider || (isCloud ? 'Groq Cloud' : 'Ollama Local');

  return (
    <div className="extract-page">
      <div className="container">
        {/* Header */}
        <div className="extract-header animate-fade-in-up">
          <div className="extract-header-row">
            <Badge variant="default"><FiDatabase /> AI Extract</Badge>
            <div className={`ollama-status ${llmStatus}`}>
              <span className="ollama-status-dot" />
              {llmStatus === 'checking' && 'Checking LLM...'}
              {llmStatus === 'online' && (
                <span className="flex items-center gap-1.5">
                  {providerIcon} {providerLabel}{llmModel ? ` · ${llmModel}` : ''}
                </span>
              )}
              {llmStatus === 'offline' && 'LLM Offline'}
            </div>
          </div>
          <h1>Extract <span className="text-gradient">Resume Info</span></h1>
          <p>Upload your resume and let AI extract structured data — Ollama locally, Groq in production.</p>
        </div>

        {/* Upload / Results */}
        {!result ? (
          <Card className="extract-upload-section animate-fade-in-up stagger-1">
            <FileUpload file={file} onFileSelect={setFile} onClear={() => setFile(null)} />

            {error && (
              <div className="extract-error animate-fade-in">
                <FiAlertTriangle /> {error}
              </div>
            )}

            {extracting ? (
              <ProgressBar stage={progress.stage} progress={progress.progress} message={progress.message} />
            ) : (
              <Button
                size="lg"
                className="extract-submit"
                onClick={handleExtract}
                disabled={!file || extracting || llmStatus === 'offline'}
              >
                <FiSend /> Extract Information
              </Button>
            )}

            {llmStatus === 'offline' && (
              <div className="extract-error" style={{ marginTop: '0.75rem' }}>
                <FiAlertTriangle />
                LLM service is unavailable. The server may still be starting up — please retry in a moment.
                <Button size="sm" variant="outline" onClick={checkLLM} style={{ marginLeft: 'auto' }}>
                  <FiRefreshCcw size={14} /> Retry
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="extract-results">
            {/* Result Hero */}
            <Card className="extract-result-hero extract-fade-in d1">
              <div>
                <Badge variant="success"><FiCheckCircle /> Extraction Complete</Badge>
                <h2>{data.name || result.filename}</h2>
                <p>Extracted from {result.filename} using <strong>{result.provider_used === 'groq' ? 'Groq Cloud' : 'Ollama Local'}</strong> · {result.model_used}</p>
                <div className="extract-result-actions">
                  <Button onClick={handleReset}><FiRefreshCcw /> Extract Another</Button>
                  <Button variant="outline" onClick={() => navigate(`/extract-detail/${result.id}`)}>
                    Full View <FiArrowRight />
                  </Button>
                </div>
              </div>
              <div className="extract-result-meta">
                <div className="extract-meta-item">
                  <span>Provider</span>
                  <strong className="flex items-center gap-1">
                    {result.provider_used === 'groq' ? <FiCloud size={13} /> : <FiServer size={13} />}
                    {result.provider_used === 'groq' ? 'Groq' : 'Ollama'}
                  </strong>
                </div>
                <div className="extract-meta-item">
                  <span>Model</span>
                  <strong>{result.model_used}</strong>
                </div>
                <div className="extract-meta-item">
                  <span>Time</span>
                  <strong>{formatTime(result.processing_time_ms)}</strong>
                </div>
                <div className="extract-meta-item">
                  <span>Words</span>
                  <strong>{result.word_count}</strong>
                </div>
              </div>
            </Card>

            {/* Sections Grid */}
            <div className="extract-grid">
              {/* Personal Info */}
              <Card className="extract-section personal extract-fade-in d2">
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
                  {data.phone?.length > 0 && data.phone.map((p, i) => (
                    <div key={i} className="personal-info-row">
                      <FiPhone size={14} />
                      <span className="personal-info-label">Phone</span>
                      <span className="personal-info-value">{p}</span>
                    </div>
                  ))}
                  {data.email?.length > 0 && data.email.map((e, i) => (
                    <div key={i} className="personal-info-row">
                      <FiMail size={14} />
                      <span className="personal-info-label">Email</span>
                      <span className="personal-info-value">
                        <a href={`mailto:${e}`}>{e}</a>
                      </span>
                    </div>
                  ))}
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
                  {data.links?.other?.length > 0 && data.links.other.map((url, i) => (
                    <div key={i} className="personal-info-row">
                      <FiLink size={14} />
                      <span className="personal-info-label">Link</span>
                      <span className="personal-info-value">
                        <a href={url} target="_blank" rel="noreferrer">{url}</a>
                      </span>
                    </div>
                  ))}
                  {!data.name && !data.phone?.length && !data.email?.length && (
                    <div className="extract-empty">No personal information found</div>
                  )}
                </div>
              </Card>

              {/* Education */}
              <Card className="extract-section education extract-fade-in d3">
                <div className="extract-section-title">
                  <div className="extract-section-icon"><FiBookOpen /></div>
                  Education
                </div>
                <div className="education-grid">
                  <div className="education-item">
                    <div className="education-item-label">10th Marks</div>
                    <div className={`education-item-value ${!data.tenth_marks ? 'empty' : ''}`}>
                      {data.tenth_marks || 'N/A'}
                    </div>
                  </div>
                  <div className="education-item">
                    <div className="education-item-label">12th Marks</div>
                    <div className={`education-item-value ${!data.twelfth_marks ? 'empty' : ''}`}>
                      {data.twelfth_marks || 'N/A'}
                    </div>
                  </div>
                  <div className="education-item">
                    <div className="education-item-label">Degree</div>
                    <div className={`education-item-value ${!data.degree ? 'empty' : ''}`}>
                      {data.degree || 'N/A'}
                    </div>
                  </div>
                  <div className="education-item">
                    <div className="education-item-label">Stream</div>
                    <div className={`education-item-value ${!data.stream ? 'empty' : ''}`}>
                      {data.stream || 'N/A'}
                    </div>
                  </div>
                  <div className="education-item">
                    <div className="education-item-label">CGPA</div>
                    <div className={`education-item-value ${!data.cgpa ? 'empty' : ''}`}>
                      {data.cgpa || 'N/A'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Skills */}
              <Card className="extract-section skills-section extract-fade-in d4">
                <div className="extract-section-title">
                  <div className="extract-section-icon"><FiTool /></div>
                  Skills
                  {data.skills?.length > 0 && (
                    <Badge variant="muted" style={{ marginLeft: 'auto' }}>{data.skills.length} found</Badge>
                  )}
                </div>
                {data.skills?.length > 0 ? (
                  <div className="extract-skills-grid">
                    {data.skills.map((skill, i) => (
                      <span key={i} className="extract-skill-tag">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <div className="extract-empty">No skills found</div>
                )}
              </Card>

              {/* Certifications */}
              <Card className="extract-section certs-section extract-fade-in d5">
                <div className="extract-section-title">
                  <div className="extract-section-icon"><FiAward /></div>
                  Certifications
                </div>
                {data.certifications?.length > 0 ? (
                  data.certifications.map((cert, i) => (
                    <div key={i} className="extract-cert-card">
                      <div className="extract-cert-icon"><FiAward size={16} /></div>
                      <div className="extract-cert-info">
                        <div className="extract-cert-name">{cert.name}</div>
                        <div className="extract-cert-meta">
                          {cert.issuer && <span>{cert.issuer}</span>}
                          {cert.issuer && cert.year && <span> · </span>}
                          {cert.year && <span>{cert.year}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="extract-empty">No certifications found</div>
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
                  data.projects.map((project, i) => (
                    <div key={i} className="extract-project-card">
                      <div className="extract-project-title">{project.title}</div>
                      {project.description && (
                        <div className="extract-project-desc">{project.description}</div>
                      )}
                      {project.tech_stack?.length > 0 && (
                        <div className="extract-project-tech">
                          {project.tech_stack.map((tech, j) => (
                            <span key={j}>{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="extract-empty">No projects found</div>
                )}
              </Card>

              {/* Experience */}
              {data.experience?.length > 0 && (
                <Card className="extract-section experience-section extract-grid-full extract-fade-in d7">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiBriefcase /></div>
                    Experience
                  </div>
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
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
