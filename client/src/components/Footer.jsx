import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-12 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Resume Analyzer</div>
                <div className="text-xs text-blue-600 font-semibold">AI Powered</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">Transform your resume with AI-powered analysis and actionable insights.</p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link to="/pricing" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Pricing
              </Link>
              <Link to="/analyze" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Analyze Resume
              </Link>
              <a href="mailto:support@resumeanalyzer.com" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Contact Support
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Legal</h3>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 pt-8 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Resume Analyzer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
