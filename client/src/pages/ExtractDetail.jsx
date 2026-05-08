import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import {
  FiArrowLeft,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCode,
  FiCpu,
  FiFileText,
  FiGithub,
  FiGlobe,
  FiLink,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiTool,
  FiUser,
  FiClock,
} from 'react-icons/fi';
import './ExtractInfo.css';

export default function ExtractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExtraction();
  }, [id]);

  const loadExtraction = async () => {
    try {
      const res = await api.get(`/extract/report/${id}`);
      setExtraction(res.data.extraction);
    } catch (err) {
      console.error('Failed to load extraction:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2>Extraction not found</h2>
      </div>
    );
  }

  const data = extraction.extracted_data || {};

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatTime = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="extract-page">
      <div className="container">
        <button
          className="btn btn-ghost report-back"
          onClick={() => navigate(-1)}
          style={{ marginBottom: '1.5rem' }}
        >
          <FiArrowLeft /> Back
        </button>

        {/* Hero */}
        <Card className="extract-result-hero extract-fade-in d1">
          <div>
            <Badge variant="default"><FiCpu /> Ollama Extraction</Badge>
            <h2><FiFileText style={{ marginRight: '0.5rem' }} />{data.name || extraction.filename}</h2>
            <p>
              <FiCalendar size={13} style={{ marginRight: '0.3rem' }} />
              {formatDate(extraction.created_at)} · {extraction.word_count} words
            </p>
          </div>
          <div className="extract-result-meta">
            <div className="extract-meta-item">
              <span>Model</span>
              <strong>{extraction.model_used}</strong>
            </div>
            <div className="extract-meta-item">
              <span>Time</span>
              <strong>{formatTime(extraction.processing_time_ms)}</strong>
            </div>
            <div className="extract-meta-item">
              <span>File</span>
              <strong>{extraction.file_type?.toUpperCase()}</strong>
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
    </div>
  );
}
