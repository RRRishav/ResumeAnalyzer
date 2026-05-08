import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin, FiZap } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="footer-hud">
      <div className="footer-glow" />
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-[0_0_24px_rgba(34,211,238,0.3)]">
                R
              </div>
              <div>
                <div className="font-bold text-white text-sm">Resume Analyzer</div>
                <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1">
                  <FiZap size={10} /> AI Powered
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Transform your resume with AI-powered analysis, real-time scoring, and actionable insights.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="footer-social-icon" aria-label="GitHub"><FiGithub size={16} /></a>
              <a href="#" className="footer-social-icon" aria-label="Twitter"><FiTwitter size={16} /></a>
              <a href="#" className="footer-social-icon" aria-label="LinkedIn"><FiLinkedin size={16} /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-cyan-200 mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <div className="flex flex-col gap-2.5">
              <Link to="/pricing" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Pricing
              </Link>
              <Link to="/analyze" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Analyze Resume
              </Link>
              <Link to="/extract" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Extract Info
              </Link>
              <a href="mailto:support@resumeanalyzer.com" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Contact Support
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-cyan-200 mb-4 text-sm uppercase tracking-wider">Legal</h3>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-cyan-200/10 pt-8 text-center">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Resume Analyzer. All rights reserved. Built with React + Node.js
          </p>
        </div>
      </div>
    </footer>
  );
}
