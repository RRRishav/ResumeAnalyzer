import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin, FiZap, FiHeart } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="footer-hud">
      <div className="footer-glow" />

      {/* Animated border */}
      <div className="footer-border-anim" />

      <div className="max-w-7xl mx-auto px-6 py-14 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="footer-logo-box">
                <span>R</span>
                <div className="footer-logo-pulse" />
              </div>
              <div>
                <div className="font-bold text-white text-sm tracking-tight">Resume Analyzer</div>
                <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1">
                  <FiZap size={10} /> AI Powered
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Transform your resume with AI-powered analysis, real-time scoring, and actionable insights for career growth.
            </p>
            <div className="flex gap-3 mt-5">
              {[
                { icon: FiGithub, label: 'GitHub' },
                { icon: FiTwitter, label: 'Twitter' },
                { icon: FiLinkedin, label: 'LinkedIn' },
              ].map(({ icon: Icon, label }) => (
                <a key={label} href="#" className="footer-social-icon" aria-label={label}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="footer-heading">Quick Links</h3>
            <div className="flex flex-col gap-3">
              {[
                { to: '/pricing', text: 'Pricing' },
                { to: '/analyze', text: 'Analyze Resume' },
                { to: '/extract', text: 'Extract Info' },
              ].map(({ to, text }) => (
                <Link key={to} to={to} className="footer-link">
                  {text}
                </Link>
              ))}
              <a href="mailto:support@resumeanalyzer.com" className="footer-link">
                Contact Support
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="footer-heading">Legal</h3>
            <div className="flex flex-col gap-3">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((text) => (
                <a key={text} href="#" className="footer-link">
                  {text}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p className="text-xs text-slate-500 flex items-center gap-1.5 justify-center">
            &copy; {new Date().getFullYear()} Resume Analyzer. Built with <FiHeart size={10} className="text-rose-400" /> using React + Node.js
          </p>
        </div>
      </div>
    </footer>
  );
}
