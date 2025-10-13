import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import { Upload as UploadIcon, FileText, Briefcase, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const Upload = () => {
  const [formData, setFormData] = useState({
    resumeText: '',
    jdText: ''
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      
      // Read file content for text files
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData({
            ...formData,
            resumeText: e.target.result
          });
        };
        reader.readAsText(file);
      }
    }
  };

  const handlePreview = async () => {
    if (!formData.resumeText || !formData.jdText) {
      toast.error('Please provide both resume and job description text');
      return;
    }

    setLoading(true);
    try {
      const response = await resumeAPI.upload({
        resumeText: formData.resumeText,
        jdText: formData.jdText
      });
      
      setParsedData(response.data.parsedData);
      setShowPreview(true);
      toast.success('Resume parsed successfully!');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to parse resume');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.resumeText || !formData.jdText) {
      toast.error('Please provide both resume and job description');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      
      if (resumeFile) {
        formDataToSend.append('resumeFile', resumeFile);
      } else {
        formDataToSend.append('resumeText', formData.resumeText);
      }
      
      formDataToSend.append('jdText', formData.jdText);

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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Resume & Job Description</h1>
        <p className="text-gray-600 mt-2">Upload your resume and job description to generate personalized interview questions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resume
              </label>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".txt,.pdf,.doc,.docx"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: TXT, PDF, DOC, DOCX (max 5MB)
                  </p>
                </div>
                
                <div className="text-center text-gray-500">OR</div>
                
                <div>
                  <textarea
                    name="resumeText"
                    value={formData.resumeText}
                    onChange={handleChange}
                    placeholder="Paste your resume text here..."
                    className="input-field h-32 resize-none"
                    required={!resumeFile}
                  />
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                name="jdText"
                value={formData.jdText}
                onChange={handleChange}
                placeholder="Paste the job description here..."
                className="input-field h-32 resize-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading || !formData.resumeText || !formData.jdText}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                <span>Preview Parse</span>
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadIcon className="w-4 h-4" />
                )}
                <span>Upload & Generate</span>
              </button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Parsed Resume Preview</h3>
          
          {showPreview && parsedData ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Personal Information</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Name:</strong> {parsedData.name || 'Not found'}</p>
                  <p><strong>Email:</strong> {parsedData.email || 'Not found'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {parsedData.skills?.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Experience</h4>
                <div className="space-y-2">
                  {parsedData.experience?.slice(0, 3).map((exp, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{exp.title} at {exp.company}</p>
                      <p className="text-sm text-gray-600">{exp.start} - {exp.end}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Education</h4>
                <div className="space-y-2">
                  {parsedData.education?.map((edu, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-gray-600">{edu.institution} ({edu.year})</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Click "Preview Parse" to see how your resume will be processed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
