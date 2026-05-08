import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiLock, FiMail, FiShield, FiTarget, FiUser, FiUserPlus, FiZap } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.warning('Passwords do not match', 3000);
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created! Welcome to Resume Analyzer 🚀', 4000);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      setError(msg);
      toast.error(msg, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-shell auth-shell-signup animate-fade-in-up">
        <Card className="auth-card">
          <div className="auth-header">
            <Badge variant="default"><FiZap /> 15 free analyses</Badge>
            <div className="auth-logo"><FiUserPlus /></div>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Start your AI resume workspace in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full Name</label>
              <div className="input-icon-wrap">
                <FiUser className="input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  className="form-input input-with-icon"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email</label>
              <div className="input-icon-wrap">
                <FiMail className="input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  className="form-input input-with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password</label>
                <div className="input-icon-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="signup-password"
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">Confirm</label>
                <div className="input-icon-wrap">
                  <FiLock className="input-icon" />
                  <input
                    id="signup-confirm"
                    type="password"
                    className="form-input input-with-icon"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="auth-submit" disabled={loading}>
              {loading ? <span className="spinner auth-spinner" /> : <><FiUserPlus /> Create Account</>}
            </Button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </Card>

        <div className="auth-showcase" aria-hidden="true">
          <div className="auth-showcase-card auth-showcase-main">
            <div className="auth-showcase-top">
              <span><FiShield /> Private workspace</span>
              <strong>15</strong>
            </div>
            <div className="auth-showcase-ring auth-showcase-ring-signup">
              <span>Free</span>
            </div>
            <div className="auth-showcase-lines">
              <i /><i /><i />
            </div>
          </div>
          <div className="auth-float-card auth-float-one">
            <FiCheck />
            <span>PDF and DOCX ready</span>
          </div>
          <div className="auth-float-card auth-float-two">
            <FiTarget />
            <span>ATS optimization</span>
          </div>
        </div>
      </div>
    </div>
  );
}
