import { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiCode,
  FiCpu,
  FiFileText,
  FiRefreshCcw,
  FiSend,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiXCircle,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import FileUpload from '../components/FileUpload';
import ProgressBar from '../components/ProgressBar';
import ScoreGauge from '../components/ScoreGauge';
import SkillChart from '../components/SkillChart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { SuggestedRolesSection } from '../components/CareerSuggestionSections';

const PRODUCTION_SOCKET_URL = 'https://resume-analyzer-api-12if.onrender.com';

const getSocketURL = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }
  return import.meta.env.VITE_SOCKET_URL || PRODUCTION_SOCKET_URL;
};

const skillName = (skill) => (typeof skill === 'string' ? skill : skill?.name || 'Skill');

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
export default function Analyzer() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(getSocketURL(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });
    socketRef.current = socket;

    socket.on('analysis_progress', (data) => {
      setProgress(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const topSkills = useMemo(() => (result?.skills || []).slice(0, 16), [result]);
  const wordCount = result?.wordCount ?? result?.word_count ?? 0;

  const handleAnalyze = async () => {
    if (!file) return;
    setError('');
    setResult(null);
    setAnalyzing(true);
    setProgress({ stage: 'parsing', progress: 5, message: 'Starting analysis...' });
    toast.info('Analysis started — processing your resume...', 3000);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (jobDesc) formData.append('jobDescription', jobDesc);

      const extractPromise = api.post('/extract/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-socket-id': socketRef.current?.id || '',
        },
      }).catch(e => ({ error: true, data: null }));

      const res = await api.post('/resume/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-socket-id': socketRef.current?.id || '',
        },
        timeout: 120000,
      });

      const extractRes = await extractPromise;
      const analysisData = res.data.analysis;
      if (extractRes && !extractRes.error && extractRes.data && extractRes.data.extraction) {
        analysisData.extracted_data = extractRes.data.extraction.extracted_data;
      }

      setResult(analysisData);
      setProgress({ stage: 'complete', progress: 100, message: 'Analysis complete!' });
      refreshUser();
      toast.success(`Analysis complete! Overall Score: ${res.data.analysis?.overall_score || '—'}/100`, 5000);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Analysis failed. Please try again.';
      const errorMsg = err.response?.data?.limit_reached
        ? 'Free analysis limit reached. Upgrade to Premium for unlimited access.'
        : msg;
      setError(errorMsg);
      setProgress({ stage: '', progress: 0, message: '' });
      toast.error(errorMsg, 6000);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress({ stage: '', progress: 0, message: '' });
    setRolesLoading(false);
  };

  const handleSuggestRoles = async () => {
    if (!result?.id) return;
    setRolesLoading(true);
    try {
      const res = await api.post(`/resume/suggest-roles/${result.id}`);
      setResult(prev => ({ ...prev, suggested_roles: res.data.suggested_roles }));
      toast.success('Generated suggested job roles!', 3000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to get job recommendations.', 4000);
    } finally {
      setRolesLoading(false);
    }
  };

  const extData = result?.extracted_data || {};
  const educationItems = extData.education?.length
    ? extData.education
    : (extData.degree || extData.stream || extData.cgpa || extData.tenth_marks || extData.twelfth_marks)
      ? [{ degree: extData.degree || 'Education', institution: null, stream: extData.stream, score: extData.cgpa, duration: null }]
      : [];

  const experiences = extData.experience || [];
  const internships = experiences.filter(exp => (exp.role || '').toLowerCase().includes('intern') || (exp.description || '').toLowerCase().includes('internship'));
  const fullTime = experiences.filter(exp => !((exp.role || '').toLowerCase().includes('intern') || (exp.description || '').toLowerCase().includes('internship')));

  return (
    <div className="analyzer">
      <div className="container">
        <div className="analyzer-header animate-fade-in-up">
          <Badge variant="default"><FiCpu /> AI Resume Lab</Badge>
          <h1>Analyze Your <span className="text-gradient">Resume</span></h1>
          <p>Upload your resume and get instant AI-powered feedback</p>
        </div>

        {!result ? (
          <Card className="analyzer-upload-section animate-fade-in-up stagger-1">
            <FileUpload file={file} onFileSelect={setFile} onClear={() => setFile(null)} />

            <div className="analyzer-options">
              <div className="form-group">
                <label className="form-label" htmlFor="job-desc">Target Job Description (Optional)</label>
                <textarea
                  id="job-desc"
                  className="form-input analyzer-textarea"
                  placeholder="Paste a job description to tune ATS and keyword analysis..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {error && (
              <div className="analyzer-error animate-fade-in">
                <FiAlertTriangle /> {error}
                {error.includes('Premium') && (
                  <Button size="sm" onClick={() => navigate('/pricing')}>Upgrade Now</Button>
                )}
              </div>
            )}

            {analyzing ? (
              <ProgressBar stage={progress.stage} progress={progress.progress} message={progress.message} />
            ) : (
              <Button size="lg" className="analyzer-submit" onClick={handleAnalyze} disabled={!file || analyzing}>
                <FiSend /> Analyze Resume
              </Button>
            )}
          </Card>
        ) : (
          <div className="analyzer-results animate-fade-in-up">
            <Card className="result-hero">
              <div className="result-hero-copy">
                <Badge variant="success"><FiCheckCircle /> Analysis complete</Badge>
                <h2>{result.filename}</h2>
                <p>{result.gemini_insights || 'Your resume report is ready with ATS scoring, skills, strengths, gaps, and prioritized improvements.'}</p>
                <div className="result-actions result-actions-hero">
                  <Button onClick={handleReset}><FiRefreshCcw /> Analyze Another</Button>
                  <Button variant="outline" onClick={() => navigate(`/report/${result.id}`)}>
                    Full Report <FiArrowRight />
                  </Button>
                </div>
              </div>
              <div className="result-score-stack">
                <div className="result-score-card">
                  <ScoreGauge score={result.overall_score} size={170} label="Overall" />
                </div>
                <div className="result-score-card">
                  <ScoreGauge score={result.ats_score} size={170} label="ATS" delay={200} />
                </div>
              </div>
            </Card>

            <div className="result-metrics">
              <Card className="result-metric-card">
                <FiTarget />
                <span>Experience</span>
                <strong>{result.experience_level || 'Unknown'}</strong>
              </Card>
              <Card className="result-metric-card">
                <FiStar />
                <span>Skills Found</span>
                <strong>{result.skills?.length || 0}</strong>
              </Card>
              <Card className="result-metric-card">
                <FiFileText />
                <span>Word Count</span>
                <strong>{wordCount}</strong>
              </Card>
              <Card className="result-metric-card">
                <FiTrendingUp />
                <span>Suggestions</span>
                <strong>{result.suggestions?.length || 0}</strong>
              </Card>
            </div>

            <div className="result-grid-main">
              <Card className="result-section result-skills-panel">
                <div className="result-section-heading">
                  <h3><FiBarChart2 /> Skill Distribution</h3>
                  <Badge variant="muted">{Object.keys(result.skillCategories || {}).length} categories</Badge>
                </div>
                <SkillChart skillCategories={result.skillCategories} />
                <div className="result-skills-tags">
                  {topSkills.map((skill, i) => (
                    <span key={i} className="skill-tag">{skillName(skill)}</span>
                  ))}
                </div>
              </Card>

              <div className="result-side-stack">
                <Card className="result-section">
                  <h3><FiCheckCircle className="result-good" /> Strengths</h3>
                  <ul className="result-list result-list-success">
                    {(result.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Card>
                <Card className="result-section">
                  <h3><FiXCircle className="result-bad" /> Weaknesses</h3>
                  <ul className="result-list result-list-danger">
                    {(result.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </Card>
              </div>
            </div>

            <Card className="result-section">
              <div className="result-section-heading">
                <h3><FiTrendingUp /> Improvement Plan</h3>
                <Badge variant="warning">Prioritized</Badge>
              </div>
              <div className="result-suggestions">
                {([...(result.suggestions || [])].sort((a, b) => {
                  const pA = typeof a === 'object' ? (a.priority || 'medium').toLowerCase() : 'medium';
                  const pB = typeof b === 'object' ? (b.priority || 'medium').toLowerCase() : 'medium';
                  const priorities = { high: 1, medium: 2, low: 3 };
                  return (priorities[pA] || 2) - (priorities[pB] || 2);
                })).map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <span className={`badge badge-${typeof s === 'object' ? (s.priority || 'medium') : 'medium'}`}>{typeof s === 'object' ? (s.priority || 'medium') : 'medium'}</span>
                    <span className="suggestion-text">{typeof s === 'object' ? (s.text || s) : s}</span>
                  </div>
                ))}
              </div>
            </Card>

            <SuggestedRolesSection
              roles={result.suggested_roles || []}
              isLoading={rolesLoading}
              onFetch={handleSuggestRoles}
              animationClass="result-section"
            />

            {result.extracted_data && (
              <div className="extract-grid" style={{ marginTop: '2rem' }}>
                <h2 style={{ gridColumn: '1 / -1', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Extracted Details</h2>
                
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
                </Card>

                {/* Skills */}
                <Card className="extract-section skills-section extract-fade-in d4">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiCode /></div>
                    Skills
                  </div>
                  {extData.skills && Object.keys(extData.skills).length > 0 ? (
                    Array.isArray(extData.skills)
                      ? <div className="extract-skills-grid">{extData.skills.map((s, i) => <span key={i} className="extract-skill-tag">{s}</span>)}</div>
                      : (
                        <div className="extract-skills-categories">
                          {Object.entries(extData.skills).map(([cat, list]) => (
                            <div key={cat} className="extract-skill-category-group">
                              <h4 className="skill-category-title">{cat}</h4>
                              <div className="extract-skills-grid">
                                {Array.isArray(list) && list.map((s, i) => <span key={i} className="extract-skill-tag">{s}</span>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                  ) : (
                    <div className="extract-empty">No skills found</div>
                  )}
                </Card>

                {/* Projects */}
                <Card className="extract-section projects-section extract-grid-full extract-fade-in d6">
                  <div className="extract-section-title">
                    <div className="extract-section-icon"><FiCode /></div>
                    Projects
                    {extData.projects?.length > 0 && (
                      <Badge variant="muted" style={{ marginLeft: 'auto' }}>{extData.projects.length} projects</Badge>
                    )}
                  </div>
                  {extData.projects?.length > 0 ? (
                    extData.projects.map((p, i) => (
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
