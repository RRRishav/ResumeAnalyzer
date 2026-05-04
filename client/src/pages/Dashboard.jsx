import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AnalysisCard from '../components/AnalysisCard';
import { FiUploadCloud, FiTrendingUp, FiAward, FiTarget, FiArrowRight } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        api.get('/resume/history?limit=6'),
        api.get('/resume/stats'),
      ]);
      setAnalyses(historyRes.data.analyses);
      setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = analyses.slice().reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: a.overall_score,
    ats: a.ats_score,
  }));

  const remaining = user?.is_premium ? '∞' : Math.max(0, (user?.max_free_analyses || 15) - (user?.analysis_count || 0));

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        {/* Welcome Banner */}
        <div className="dash-welcome animate-fade-in-up">
          <div className="dash-welcome-text">
            <h1>Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋</h1>
            <p>{user?.is_premium ? 'Premium member — unlimited analyses' : `${remaining} free analyses remaining`}</p>
          </div>
          <Link to="/analyze" className="btn btn-primary">
            <FiUploadCloud /> New Analysis
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="dash-stats animate-fade-in-up stagger-1">
          <div className="dash-stat-card glass-card">
            <div className="dash-stat-icon" style={{ background: 'rgba(108, 99, 255, 0.1)', color: 'var(--accent-primary)' }}>
              <FiTrendingUp size={22} />
            </div>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.total_analyses || 0}</span>
              <span className="dash-stat-label">Total Analyses</span>
            </div>
          </div>
          <div className="dash-stat-card glass-card">
            <div className="dash-stat-icon" style={{ background: 'rgba(0, 212, 170, 0.1)', color: 'var(--accent-secondary)' }}>
              <FiAward size={22} />
            </div>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{Math.round(stats?.avg_score || 0)}</span>
              <span className="dash-stat-label">Avg Score</span>
            </div>
          </div>
          <div className="dash-stat-card glass-card">
            <div className="dash-stat-icon" style={{ background: 'rgba(255, 107, 157, 0.1)', color: 'var(--accent-tertiary)' }}>
              <FiTarget size={22} />
            </div>
            <div className="dash-stat-info">
              <span className="dash-stat-value">{stats?.best_score || 0}</span>
              <span className="dash-stat-label">Best Score</span>
            </div>
          </div>
        </div>

        {/* Score Trend Chart */}
        {chartData.length > 1 && (
          <div className="dash-chart glass-card animate-fade-in-up stagger-2">
            <h3 className="dash-section-title">Score Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a0a0b8', fontSize: 12 }} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#a0a0b8', fontSize: 12 }} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  labelStyle={{ color: '#e8e8f0' }}
                />
                <Line type="monotone" dataKey="score" stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: '#6c63ff', r: 4 }} name="Overall" />
                <Line type="monotone" dataKey="ats" stroke="#00d4aa" strokeWidth={2} dot={{ fill: '#00d4aa', r: 3 }} name="ATS" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Analyses */}
        <div className="dash-recent animate-fade-in-up stagger-3">
          <div className="dash-section-header">
            <h3 className="dash-section-title">Recent Analyses</h3>
            {analyses.length > 0 && (
              <Link to="/history" className="dash-view-all">
                View All <FiArrowRight size={14} />
              </Link>
            )}
          </div>

          {analyses.length === 0 ? (
            <div className="dash-empty glass-card">
              <FiUploadCloud size={48} className="dash-empty-icon" />
              <h3>No analyses yet</h3>
              <p>Upload your first resume to get started</p>
              <Link to="/analyze" className="btn btn-primary" style={{ marginTop: 16 }}>
                <FiUploadCloud /> Analyze Resume
              </Link>
            </div>
          ) : (
            <div className="dash-analyses-grid">
              {analyses.map((a) => (
                <AnalysisCard key={a.id} analysis={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
