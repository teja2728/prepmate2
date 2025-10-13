import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resumeAPI, generateAPI } from '../services/api';
import { 
  HelpCircle, 
  Building2, 
  BookOpen, 
  ExternalLink,
  Clock,
  AlertTriangle,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const Results = () => {
  const { resumeId } = useParams();
  const [activeTab, setActiveTab] = useState('questions');
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [companyArchive, setCompanyArchive] = useState(null);
  const [resources, setResources] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState({
    resume: true,
    questions: false,
    company: false,
    resources: false
  });

  useEffect(() => {
    fetchResume();
  }, [resumeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResume = async () => {
    try {
      const response = await resumeAPI.getById(resumeId);
      setResume(response.data.resume);
    } catch (error) {
      console.error('Error fetching resume:', error);
      toast.error('Failed to load resume');
    } finally {
      setLoading(prev => ({ ...prev, resume: false }));
    }
  };

  const generateQuestions = async () => {
    setLoading(prev => ({ ...prev, questions: true }));
    try {
      const response = await generateAPI.questions({ resumeId });
      setQuestions(response.data.questions);
      toast.success('Questions generated successfully!');
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions');
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  const fetchCompanyArchive = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    setLoading(prev => ({ ...prev, company: true }));
    try {
      const response = await generateAPI.companyArchive(companyName);
      setCompanyArchive(response.data);
      toast.success('Company archive retrieved!');
    } catch (error) {
      console.error('Error fetching company archive:', error);
      toast.error('Failed to fetch company archive');
    } finally {
      setLoading(prev => ({ ...prev, company: false }));
    }
  };

  const generateResources = async () => {
    setLoading(prev => ({ ...prev, resources: true }));
    try {
      const response = await generateAPI.resources(resume.jdText);
      setResources(response.data.skills);
      toast.success('Resources generated successfully!');
    } catch (error) {
      console.error('Error generating resources:', error);
      toast.error('Failed to generate resources');
    } finally {
      setLoading(prev => ({ ...prev, resources: false }));
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'behavioral': return 'bg-blue-100 text-blue-800';
      case 'technical': return 'bg-purple-100 text-purple-800';
      case 'coding': return 'bg-orange-100 text-orange-800';
      case 'design': return 'bg-pink-100 text-pink-800';
      case 'aptitude': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceTypeIcon = (type) => {
    switch (type) {
      case 'video': return '🎥';
      case 'article': return '📄';
      case 'doc': return '📚';
      case 'course': return '🎓';
      case 'repo': return '💻';
      default: return '🔗';
    }
  };

  if (loading.resume) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Resume not found</h2>
        <Link to="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Preparation</h1>
            <p className="text-gray-600 mt-2">
              Resume: {resume.parsedData?.name || 'Unknown'} • 
              Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Link to="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'questions', label: 'Interview Questions', icon: HelpCircle },
            { id: 'company', label: 'Company Archive', icon: Building2 },
            { id: 'resources', label: 'Learning Resources', icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Interview Questions</h2>
                <p className="text-gray-600 mt-1">
                  AI-generated questions tailored to your resume and job description
                </p>
              </div>
              <button
                onClick={generateQuestions}
                disabled={loading.questions}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {loading.questions ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <HelpCircle className="w-4 h-4" />
                )}
                <span>Generate Questions</span>
              </button>
            </div>

            {questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex-1">
                        {question.question}
                      </h3>
                      <div className="flex space-x-2 ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.type)}`}>
                          {question.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{question.rationale}</p>
                    {question.relatedSkills && question.relatedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {question.relatedSkills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Generate Questions" to create personalized interview questions</p>
              </div>
            )}
          </div>
        )}

        {/* Company Archive Tab */}
        {activeTab === 'company' && (
          <div className="card">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Archive</h2>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name (e.g., Google, Microsoft)"
                  className="input-field flex-1"
                />
                <button
                  onClick={fetchCompanyArchive}
                  disabled={loading.company}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading.company ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>Search</span>
                </button>
              </div>
            </div>

            {companyArchive ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">{companyArchive.company}</h3>
                  </div>
                  {companyArchive.note && (
                    <p className="text-sm text-blue-700">{companyArchive.note}</p>
                  )}
                </div>

                {companyArchive.rounds && companyArchive.rounds.length > 0 ? (
                  <div className="space-y-4">
                    {companyArchive.rounds.map((round, roundIndex) => (
                      <div key={roundIndex} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h4 className="font-medium text-gray-900">{round.roundName}</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          {round.questions.map((question, qIndex) => (
                            <div key={qIndex} className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                {qIndex + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-900 mb-1">{question.question}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>Source: {question.source}</span>
                                  <div className="flex items-center space-x-1">
                                    <span>Confidence:</span>
                                    <div className="flex items-center space-x-1">
                                      <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            question.confidence > 0.7 ? 'bg-green-500' :
                                            question.confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${question.confidence * 100}%` }}
                                        ></div>
                                      </div>
                                      <span>{Math.round(question.confidence * 100)}%</span>
                                    </div>
                                  </div>
                                  {question.confidence < 0.4 && (
                                    <div className="flex items-center space-x-1 text-orange-600">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Unverified</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No previous interview questions found for this company</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Enter a company name to search for previous interview questions</p>
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Learning Resources</h2>
                <p className="text-gray-600 mt-1">
                  Curated resources for skills mentioned in the job description
                </p>
              </div>
              <button
                onClick={generateResources}
                disabled={loading.resources}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {loading.resources ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                <span>Generate Resources</span>
              </button>
            </div>

            {resources.length > 0 ? (
              <div className="space-y-6">
                {resources.map((skillGroup, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">{skillGroup.skill}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {skillGroup.resources.map((resource, resIndex) => (
                        <div key={resIndex} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">{getResourceTypeIcon(resource.type)}</span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{resource.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{resource.summary}</p>
                              <div className="flex items-center justify-between">
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                                >
                                  <span>View Resource</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{resource.estimatedTime}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Click "Generate Resources" to get learning materials for job skills</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
