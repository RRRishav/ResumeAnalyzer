import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX } from 'react-icons/fi';
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
    <nav className="sticky top-0 z-40 border-b border-cyan-200/10 bg-slate-950/78 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-md bg-cyan-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            R
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white">Resume</span>
            <span className="text-xs text-cyan-300 font-semibold">ANALYZER</span>
          </div>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/analyze"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/analyze')
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Analyze
              </Link>
              <Link
                to="/extract"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/extract')
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Extract
              </Link>
              <Link
                to="/history"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/history')
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                History
              </Link>
              <Link
                to="/extract-history"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/extract-history')
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Extractions
              </Link>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-400">{user.email?.split('@')[0]}</div>
                <Button size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/pricing')
                    ? 'text-cyan-200'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link to="/signup" className="inline-flex">
                <Button size="sm">
                Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-cyan-200/10 bg-slate-950/96 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/analyze"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Analyze
                </Link>
                <Link
                  to="/extract"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Extract
                </Link>
                <Link
                  to="/history"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  History
                </Link>
                <Link
                  to="/extract-history"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Extractions
                </Link>
                <Button
                  onClick={handleLogout}
                  className="w-full"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="w-full"
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
