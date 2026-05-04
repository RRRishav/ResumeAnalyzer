import { useState, useEffect } from 'react';
import api from '../services/api';
import AnalysisCard from '../components/AnalysisCard';
import { FiSearch, FiClock } from 'react-icons/fi';

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => { loadHistory(); }, [page]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/resume/history?page=${page}&limit=12`);
      setAnalyses(res.data.analyses);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? analyses.filter(a => a.filename.toLowerCase().includes(search.toLowerCase()))
    : analyses;

  return (
    <div className="history">
      <div className="container">
        <div className="history-header animate-fade-in-up">
          <div>
            <h1><FiClock /> Analysis <span className="text-gradient">History</span></h1>
            <p>View all your past resume analyses</p>
          </div>
          <div className="history-search">
            <FiSearch className="history-search-icon" />
            <input type="text" className="form-input" placeholder="Search by filename..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="history-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="history-empty glass-card">
            <p>No analyses found</p>
          </div>
        ) : (
          <>
            <div className="history-grid animate-fade-in-up stagger-1">
              {filtered.map(a => <AnalysisCard key={a.id} analysis={a} />)}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="history-page-info">Page {page} of {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
