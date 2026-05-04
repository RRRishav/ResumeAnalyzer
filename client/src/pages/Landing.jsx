import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiCpu,
  FiFileText,
  FiShield,
  FiTarget,
  FiUploadCloud,
  FiZap,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import InteractiveResumeScene from '../components/InteractiveResumeScene';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const features = [
  { icon: FiCpu, title: 'AI Review', desc: 'AI-powered feedback for wording, structure, impact, and gaps.' },
  { icon: FiTarget, title: 'ATS Score', desc: 'Keyword alignment, readability, and role-fit scoring in one pass.' },
  { icon: FiBarChart2, title: 'Skill Map', desc: 'Detected skills are grouped into clean categories for quick scanning.' },
  { icon: FiShield, title: 'Secure Uploads', desc: 'PDF and DOCX parsing runs through the connected Node backend.' },
];

const pipeline = [
  'Upload PDF or DOCX',
  'Track live parser progress',
  'Review scores and gaps',
  'Open full report history',
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;
    api.get('/health')
      .then(() => mounted && setApiStatus('online'))
      .catch(() => mounted && setApiStatus('offline'));

    return () => {
      mounted = false;
    };
  }, []);

  const startPath = user ? '/analyze' : '/signup';

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="container landing-hero-grid">
          <div className="landing-copy">
            <div className="landing-badges">
              <Badge variant={apiStatus === 'online' ? 'success' : apiStatus === 'offline' ? 'warning' : 'muted'}>
                <span className="status-dot" />
                Backend {apiStatus}
              </Badge>
            </div>

            <h1>Resume Analyzer</h1>
            <p className="landing-lede">
              A polished AI workspace for uploading resumes, watching live analysis progress, and turning score data into a sharper job application.
            </p>

            <div className="landing-actions">
              <Button size="lg" onClick={() => navigate(startPath)}>
                <FiUploadCloud /> Analyze Resume <FiArrowRight />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                View Plans
              </Button>
            </div>

            <div className="landing-stats">
              <div><strong>15</strong><span>free analyses</span></div>
              <div><strong>200+</strong><span>skills detected</span></div>
              <div><strong>Live</strong><span>socket progress</span></div>
            </div>
          </div>

          <InteractiveResumeScene />
        </div>
      </section>

      <section className="landing-band">
        <div className="container landing-band-grid">
          <Card className="landing-console">
            <CardHeader>
              <CardTitle>Connected Analysis Pipeline</CardTitle>
              <CardDescription>Frontend events, API requests, and Socket.IO progress are wired into one flow.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="pipeline-list">
                {pipeline.map((item, index) => (
                  <div className="pipeline-item" key={item}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{item}</p>
                    <FiCheck />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card className="feature-card-neo" key={feature.title}>
                  <CardHeader>
                    <div className="feature-icon-neo"><Icon /></div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="container cta-grid">
          <div>
            <Badge variant="muted"><FiFileText /> Reports saved to history</Badge>
            <h2>Start with the real analyzer, not a demo wall.</h2>
          </div>
          <Button size="lg" onClick={() => navigate(startPath)}>
            Open Analyzer <FiArrowRight />
          </Button>
        </div>
      </section>
    </div>
  );
}
