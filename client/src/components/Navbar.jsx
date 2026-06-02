import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiChevronRight } from 'react-icons/fi';
import { Button } from './ui/button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar-glass sticky top-0 z-40">
      {/* Top glow line */}
      <div className="navbar-glow-line" />

      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="navbar-logo-box">
            <span className="navbar-logo-letter">R</span>
            <div className="navbar-logo-shine" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white text-[0.95rem] tracking-tight group-hover:text-cyan-200 transition-colors">Resume</span>
            <span className="text-[0.65rem] text-cyan-300 font-bold tracking-[0.18em] uppercase">ANALYZER</span>
          </div>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-0.5">
          {user ? (
            <>
              {[
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/analyze', label: 'Analyze' },
                { to: '/extract', label: 'Extract' },
                { to: '/history', label: 'History' },
                { to: '/extract-history', label: 'Extractions' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`navbar-link ${isActive(link.to) ? 'navbar-link-active' : ''}`}
                >
                  {link.label}
                  {isActive(link.to) && <span className="navbar-link-indicator" />}
                </Link>
              ))}
              <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-3" />
              <div className="flex items-center gap-3">
                <div className="navbar-user-chip">
                  <div className="navbar-user-avatar">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{user.email?.split('@')[0]}</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className={`navbar-link ${isActive('/pricing') ? 'navbar-link-active' : ''}`}
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="navbar-link"
              >
                Login
              </Link>
              <Link to="/signup" className="inline-flex ml-2">
                <Button size="sm">
                  Sign Up <FiChevronRight size={14} />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden navbar-mobile-menu">
          <div className="px-6 py-5 flex flex-col gap-1">
            {user ? (
              <>
                {[
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/analyze', label: 'Analyze' },
                  { to: '/extract', label: 'Extract' },
                  { to: '/history', label: 'History' },
                  { to: '/extract-history', label: 'Extractions' },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="navbar-mobile-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                    <FiChevronRight size={14} className="text-white/20" />
                  </Link>
                ))}
                <div className="my-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <Button onClick={handleLogout} className="w-full">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className="navbar-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Pricing
                  <FiChevronRight size={14} className="text-white/20" />
                </Link>
                <Link
                  to="/login"
                  className="navbar-mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                  <FiChevronRight size={14} className="text-white/20" />
                </Link>
                <Link
                  to="/signup"
                  className="w-full mt-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
