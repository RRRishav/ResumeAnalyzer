import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  FiDatabase,
  FiFileText,
  FiClock,
  FiUser,
  FiMail,
  FiTool,
  FiCpu,
  FiArrowRight,
} from 'react-icons/fi';
import './ExtractInfo.css';

export default function ExtractHistory() {
  const navigate = useNavigate();
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/extract/history?page=${page}&limit=10`);
      setExtractions(res.data.extractions || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load extraction history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="extract-page">
      <div className="container">
        <div className="extract-header animate-fade-in-up">
          <Badge variant="default"><FiDatabase /> Extraction History</Badge>
          <h1>Past <span className="text-gradient">Extractions</span></h1>
          <p>View all your previously extracted resume data</p>
        </div>

        {extractions.length === 0 ? (
          <Card className="extract-upload-section animate-fade-in-up stagger-1" style={{ textAlign: 'center' }}>
            <div className="extract-empty" style={{ padding: '2rem' }}>
              <FiDatabase size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>No extractions yet. Go to <strong>Extract Info</strong> to get started!</p>
              <Button onClick={() => navigate('/extract')} style={{ marginTop: '1rem' }}>
                <FiArrowRight /> Extract Resume
              </Button>
            </div>
          </Card>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {extractions.map((item, i) => (
              <Card
                key={item.id}
                className={`extract-fade-in d${Math.min(i + 1, 7)}`}
                style={{
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => navigate(`/extract-detail/${item.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: 'rgba(139,92,246,0.12)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0,
                    }}>
                      <FiFileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                        {item.name || item.filename}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {item.email && <span><FiMail size={11} style={{ marginRight: '0.25rem' }} />{item.email}</span>}
                        <span><FiTool size={11} style={{ marginRight: '0.25rem' }} />{item.skills_count} skills</span>
                        <span><FiCpu size={11} style={{ marginRight: '0.25rem' }} />{item.model_used}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                      <div><FiClock size={11} style={{ marginRight: '0.2rem' }} />{formatTime(item.processing_time_ms)}</div>
                      <div style={{ marginTop: '0.15rem' }}>{formatDate(item.created_at)}</div>
                    </div>
                    <FiArrowRight size={16} style={{ color: '#64748b' }} />
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                  {page} / {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
