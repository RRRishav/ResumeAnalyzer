import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiFileText,
  FiMapPin,
  FiStar,
} from 'react-icons/fi';
import ScoreGauge from '../components/ScoreGauge';
import { loadResumeDataset } from '../data/resumeDataset';
import './ReportDetail.css';
import './DatasetReportDetail.css';

const skillName = (skill) => (
  typeof skill === 'string'
    ? skill
    : skill?.name || skill?.skill || skill?.title || skill?.value || ''
);

export default function DatasetReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadResume = async () => {
      setLoading(true);
      try {
        const rows = await loadResumeDataset();
        const decodedId = decodeURIComponent(id || '');
        const match = rows.find((row) => String(row.dataset_id || row.id) === decodedId);
        if (active) setResume(match || null);
      } catch (error) {
        console.error('Failed to load dataset resume:', error);
        if (active) setResume(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadResume();
    return () => {
      active = false;
    };
  }, [id]);

  const skillList = useMemo(
    () => (resume?.skills || []).map(skillName).filter(Boolean),
    [resume],
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="report-detail dataset-report">
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h2>Dataset resume not found</h2>
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/history')}>
            Back to search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-detail dataset-report">
      <div className="container">
        <button className="btn btn-ghost report-back" type="button" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <div className="dataset-report-hero animate-fade-in-up">
          <div>
            <span className="dataset-report-kicker"><FiFileText /> Dataset candidate</span>
            <h1>{resume.name || resume.filename}</h1>
            <p>
              <FiBriefcase size={14} /> {resume.role || 'Dataset candidate'}
              <span>|</span>
              <FiAward size={14} /> {resume.experience_level}
              <span>|</span>
              <FiMapPin size={14} /> {resume.location || 'Location not listed'}
            </p>
          </div>
        </div>

        <div className="dataset-score-grid animate-fade-in-up stagger-1">
          <div className="dataset-score-card">
            <ScoreGauge score={resume.overall_score} size={168} label="Overall Score" />
          </div>
          <div className="dataset-score-card">
            <ScoreGauge score={resume.ats_score} size={168} label="ATS Score" delay={300} />
          </div>
          <div className="dataset-summary-card">
            <h3>Candidate Summary</h3>
            <p>{resume.gemini_insights || 'No summary is available for this dataset candidate.'}</p>
          </div>
        </div>

        <div className="dataset-skills-card animate-fade-in-up stagger-2">
          <div className="dataset-section-heading">
            <div>
              <h3><FiStar /> Skill Details</h3>
              <p>{resume.role || 'Candidate'} skills discovered from the CSV profile.</p>
            </div>
            <span>{skillList.length} skills</span>
          </div>
          <div className="dataset-skill-list">
            {skillList.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </div>

        <div className="dataset-profile-grid animate-fade-in-up stagger-3">
          <div className="dataset-info-card">
            <span>Role</span>
            <strong>{resume.role || 'Not listed'}</strong>
          </div>
          <div className="dataset-info-card">
            <span>Experience</span>
            <strong>{resume.experience_years || 'Not listed'} years</strong>
          </div>
          <div className="dataset-info-card">
            <span>Education</span>
            <strong>{resume.education || 'Not listed'}</strong>
          </div>
          <div className="dataset-info-card">
            <span>Dataset ID</span>
            <strong>{resume.dataset_id}</strong>
          </div>
          <div className="dataset-info-card dataset-info-card-wide">
            <span>Filename</span>
            <strong>{resume.filename}</strong>
          </div>
          <div className="dataset-info-card dataset-info-card-wide">
            <span>Source</span>
            <strong>Built-in CSV resume bank</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
