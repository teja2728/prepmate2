import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { GeneratedProvider } from './contexts/GeneratedContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Results from './pages/Results';
import ResumeImprover from './pages/ResumeImprover';
import SavedResources from './pages/SavedResources';
import DailyChallenge from './pages/DailyChallenge';
import Progress from './pages/Progress';
import Upload from './pages/Upload';

// ✅ New page for Gemini Link Extraction
function GeminiResources() {
  const [links, setLinks] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/generate/links');
        const data = await res.json();
        if (data.success) {
          setText(data.text);
          setLinks(data.links);
        } else {
          console.error('Gemini API Error:', data.error);
        }
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Automatically call Gemini API on component mount
    fetchLinks();
  }, []);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        🔗 Gemini Auto-Fetched Learning Resources
      </h2>

      {loading ? (
        <p className="text-gray-500">Fetching resources from Gemini...</p>
      ) : (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Gemini Response:</h3>
            <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
              {text}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Extracted Links:</h3>
            {links.length === 0 ? (
              <p className="text-gray-500">No links found.</p>
            ) : (
              <ul className="list-disc pl-6">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <GeneratedProvider>
        <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results/:resumeId"
                element={
                  <ProtectedRoute>
                    <Results />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume-improver/:resumeId"
                element={
                  <ProtectedRoute>
                    <ResumeImprover />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results/:resumeId/suggestions"
                element={
                  <ProtectedRoute>
                    <Results />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/daily-challenge"
                element={
                  <ProtectedRoute>
                    <DailyChallenge />
                  </ProtectedRoute>
                }
              />

              {/* ✅ New Auto Gemini Page */}
              <Route
                path="/resources"
                element={
                  <ProtectedRoute>
                    <GeminiResources />
                  </ProtectedRoute>
                }
              />

              {/* Saved Resources */}
              <Route
                path="/saved-resources"
                element={
                  <ProtectedRoute>
                    <SavedResources />
                  </ProtectedRoute>
                }
              />

              {/* Progress */}
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <Progress />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
        </Router>
      </GeneratedProvider>
    </AuthProvider>
  );
}

export default App;
