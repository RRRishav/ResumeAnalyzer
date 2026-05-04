import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiCheck, FiLock, FiLogIn, FiMail, FiShield, FiZap } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-shell animate-fade-in-up">
        <Card className="auth-card">
          <div className="auth-header">
            <Badge variant="default"><FiZap /> Resume Analyzer</Badge>
            <div className="auth-logo"><FiLogIn /></div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue analyzing resumes</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <div className="input-icon-wrap">
                <FiMail className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input input-with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  className="form-input input-with-icon"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="auth-submit" disabled={loading}>
              {loading ? <span className="spinner auth-spinner" /> : <><FiLogIn /> Sign In</>}
            </Button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </Card>

        <div className="auth-showcase" aria-hidden="true">
          <div className="auth-showcase-card auth-showcase-main">
            <div className="auth-showcase-top">
              <span><FiShield /> Secure session</span>
              <strong>94</strong>
            </div>
            <div className="auth-showcase-ring">
              <span>ATS</span>
            </div>
            <div className="auth-showcase-lines">
              <i /><i /><i />
            </div>
          </div>
          <div className="auth-float-card auth-float-one">
            <FiCheck />
            <span>Reports synced</span>
          </div>
          <div className="auth-float-card auth-float-two">
            <FiBarChart2 />
            <span>Live score history</span>
          </div>
        </div>
      </div>
    </div>
  );
}
