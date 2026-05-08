import { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
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

const PRODUCTION_SOCKET_URL = 'https://resume-analyzer-api-12if.onrender.com';

const getSocketURL = () => {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }
  return import.meta.env.VITE_SOCKET_URL || PRODUCTION_SOCKET_URL;
};

const skillName = (skill) => (typeof skill === 'string' ? skill : skill?.name || 'Skill');

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

      const res = await api.post('/resume/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-socket-id': socketRef.current?.id || '',
        },
        timeout: 120000,
      });

      setResult(res.data.analysis);
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
  };

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
                {(result.suggestions || []).map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <span className={`badge badge-${s.priority || 'medium'}`}>{s.priority || 'medium'}</span>
                    <span className="suggestion-text">{s.text || s}</span>
                  </div>
                ))}
              </div>
            </Card>

            {result.career_recommendations?.length > 0 && (
              <Card className="result-section">
                <h3><FiStar /> Career Recommendations</h3>
                <div className="result-careers">
                  {result.career_recommendations.map((c, i) => (
                    <div key={i} className="career-item">
                      <div className="career-info">
                        <span className="career-role">{c.role}</span>
                        <span className="career-reason">{c.reason}</span>
                      </div>
                      <div className="career-match">
                        <span className="career-match-value">{c.match_score}%</span>
                        <span className="career-match-label">Match</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
