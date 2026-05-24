import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import './components/Toast.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ParticleField from './components/ParticleField';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Analyzer from './pages/Analyzer';
import History from './pages/History';
import ReportDetail from './pages/ReportDetail';
import DatasetReportDetail from './pages/DatasetReportDetail';
import Pricing from './pages/Pricing';
import ExtractInfo from './pages/ExtractInfo';
import ExtractHistory from './pages/ExtractHistory';
import ExtractDetail from './pages/ExtractDetail';
import DriveExtract from './pages/DriveExtract';
import OcrExtract from './pages/OcrExtract';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="app-shell flex flex-col min-h-screen">
            {/* Global animated background */}
            <ParticleField count={30} />
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/analyze" element={<ProtectedRoute><Analyzer /></ProtectedRoute>} />
                <Route path="/extract" element={<ProtectedRoute><ExtractInfo /></ProtectedRoute>} />
                <Route path="/extract-history" element={<ProtectedRoute><ExtractHistory /></ProtectedRoute>} />
                <Route path="/extract-detail/:id" element={<ProtectedRoute><ExtractDetail /></ProtectedRoute>} />
                <Route path="/drive-extract" element={<ProtectedRoute><DriveExtract /></ProtectedRoute>} />
                <Route path="/ocr-extract" element={<OcrExtract />} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
                <Route path="/dataset-report/:id" element={<ProtectedRoute><DatasetReportDetail /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
