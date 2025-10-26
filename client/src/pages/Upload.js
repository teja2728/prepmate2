import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import { Upload as UploadIcon, FileText, Briefcase, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const Upload = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
    }
  };
  const handleJDChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJdFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resumeFile || !jdFile) {
      toast.error('Please select both resume and job description files');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('resumeFile', resumeFile);
      formDataToSend.append('jdFile', jdFile);

      const response = await resumeAPI.upload(formDataToSend);
      
      toast.success('Resume uploaded successfully!');
      navigate(`/results/${response.data.resumeId}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page">
      <div className="mb-6">
        <h1 className="section-title">Upload Resume & Job Description</h1>
        <p className="text-sm text-gray-600 mt-1">Upload your resume and job description to generate personalized interview questions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Resume</span>
              </label>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    onChange={handleResumeChange}
                    accept=".txt,.pdf,.doc,.docx"
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 border border-gray-300 rounded-md p-2 bg-white"
                  />
                  <p className="text-xs text-gray-600 mt-2">Supported: TXT, PDF, DOC, DOCX (max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span>Job Description</span>
              </label>
              <input
                type="file"
                onChange={handleJDChange}
                accept=".txt,.pdf,.doc,.docx"
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 border border-gray-300 rounded-md p-2 bg-white"
              />
              <p className="text-xs text-gray-600 mt-2">Supported: TXT, PDF, DOC, DOCX (max 5MB)</p>
            </div>

            {/* Action Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`btn-primary flex-1 btn-icon ${loading ? 'btn-disabled' : ''}`}
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
                <span>Upload & Generate</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Upload;
