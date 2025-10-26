import { Calendar, Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { resumeAPI } from '../services/api';

const Dashboard = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumes();
    // Listen for external updates (e.g., after an upload elsewhere)
    const onUpdated = () => fetchResumes();
    window.addEventListener('resume:updated', onUpdated);
    return () => window.removeEventListener('resume:updated', onUpdated);
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await resumeAPI.getAll();
      const raw = Array.isArray(response.data?.resumes)
        ? response.data.resumes
        : Array.isArray(response.data)
          ? response.data
          : [];

      const normalized = raw.map((r) => {
        const id = r._id || r.id;
        const name = r.name || r.filename || r.fileName || 'Resume';
        const email = r.email || r.parsedData?.email || null;
        const skillsRaw = r.skills || r.parsedData?.skills || [];
        const skills = Array.isArray(skillsRaw)
          ? skillsRaw
          : typeof skillsRaw === 'string'
            ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        const createdAt = r.createdAt || r.uploadedAt || new Date().toISOString();
        return { id, name, email, skills, createdAt };
      });

      setResumes(normalized);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      await resumeAPI.delete(id);
      setResumes((prev) => prev.filter((resume) => resume.id !== id));
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="loading-spinner"></div>
          <p className="mt-3 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your resumes and job descriptions</p>
        </div>
        
      </div>

      {resumes.length === 0 ? (
        <div className="card text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No resumes yet</h3>
          <p className="text-gray-600 mb-4">Upload your first resume and job description to get started</p>
          <Link to="/upload" className="btn-primary btn-icon">
            <Plus className="w-5 h-5" />
            <span>Upload Resume and Job Description</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <div key={resume.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{resume.name || 'Resume'}</h3>
                    <p className="text-sm text-gray-600">{resume.email || 'No email found'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/results/${resume.id}`}
                    className="p-2 text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-md"
                    title="View Results"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="p-2 text-gray-600 hover:text-red-700 hover:bg-gray-100 rounded-md"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {(resume.skills && resume.skills.length > 0) ? (
                      <>
                        {resume.skills.slice(0, 5).map((skill, index) => (
                          <span key={index} className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs rounded-full border border-gray-200">
                            {skill}
                          </span>
                        ))}
                        {resume.skills.length > 5 && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs rounded-full border border-gray-200">+{resume.skills.length - 5} more</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">No skills extracted</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(resume.createdAt)}</span>
                  </div>
                  <Link to={`/results/${resume.id}`} className="text-blue-700 hover:underline font-medium">
                    View Results
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;