import {
  BookOpen,
  Building2,
  ExternalLink,
  HelpCircle,
  Loader
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { generateAPI, resumeAPI, resourcesAPI, progressAPI } from "../services/api";
import { useGenerated } from "../contexts/GeneratedContext";
import ResourceViewer from "../components/ResourceViewer";
import Accordion from "../components/Accordion";

const Results = () => {
  const { resumeId } = useParams();
  const generated = useGenerated();
  const [activeTab, setActiveTab] = useState("questions");
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [companyArchive, setCompanyArchive] = useState(null);
  const [resources, setResources] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState({ q: false, c: false, r: false, s: false });
  const [progress, setProgress] = useState({}); // key: resourceLink, value: boolean
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerResource, setViewerResource] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState({
    resume: true,
    questions: false,
    company: false,
    resources: false,
    suggestions: false,
  });

  // Auto-generate suggestions when user opens the tab and nothing is cached yet
  useEffect(() => {
    if (activeTab === 'suggestions' && !suggestions && !loading.suggestions) {
      generateSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
  const fetchResume = async () => {
    try {
      const response = await resumeAPI.getById(resumeId);
      setResume(response.data.resume);
    } catch (error) {
      console.error("Error fetching resume:", error);
      toast.error("Failed to load resume");
    } finally {
      setLoading((prev) => ({ ...prev, resume: false }));
    }
  };

  fetchResume();

  // Hydrate from cache if available
  const cached = generated.get(resumeId);
  if (cached) {
    if (cached.questions) {
      setQuestions(cached.questions);
      setLoadedFromCache((p) => ({ ...p, q: true }));
    }
    if (cached.companyArchive) {
      setCompanyArchive(cached.companyArchive);
      setLoadedFromCache((p) => ({ ...p, c: true }));
    }
    if (cached.resources) {
      setResources(cached.resources);
      setLoadedFromCache((p) => ({ ...p, r: true }));
    }
    if (cached.resumeSuggestions) {
      setSuggestions(cached.resumeSuggestions);
      setLoadedFromCache((p) => ({ ...p, s: true }));
    }
  }
  // Always hydrate completion status from backend on mount
  const loadProgress = async () => {
    try {
      const pg = await progressAPI.getMine();
      const map = {};
      (pg.data.progress || []).forEach((p) => {
        if (p.resourceLink) map[p.resourceLink] = !!p.isCompleted;
      });
      setProgress(map);
    } catch (_) {}
  };
  loadProgress();
}, [resumeId]);


  const generateQuestions = async () => {
    setLoading((prev) => ({ ...prev, questions: true }));
    try {
      const response = await generateAPI.questions({ resumeId });
      setQuestions(response.data.questions);
      generated.setQuestions(resumeId, response.data.questions);
      toast.success("AI-generated interview questions ready!");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setLoading((prev) => ({ ...prev, questions: false }));
    }
  };

  const fetchCompanyArchive = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    setLoading((prev) => ({ ...prev, company: true }));
    try {
      const response = await generateAPI.companyArchive(companyName);
      setCompanyArchive(response.data);
      generated.setCompanyArchive(resumeId, response.data);
      toast.success("Fetched company archive successfully!");
    } catch (error) {
      console.error("Error fetching company archive:", error);
      toast.error("Failed to fetch company archive");
    } finally {
      setLoading((prev) => ({ ...prev, company: false }));
    }
  };

  const generateResources = async () => {
    setLoading((prev) => ({ ...prev, resources: true }));
    try {
      const response = await generateAPI.resources({ resumeId });
      setResources(response.data.skills);
      generated.setResources(resumeId, response.data.skills);
      // After loading resources, refresh completion map
      try {
        const pg = await progressAPI.getMine();
        const map = {};
        (pg.data.progress || []).forEach((p) => {
          if (p.resourceLink) map[p.resourceLink] = !!p.isCompleted;
        });
        setProgress(map);
      } catch (_) {}
      toast.success("Learning resources generated dynamically!");
    } catch (error) {
      console.error("Error generating resources:", error);
      toast.error("Failed to generate resources");
    } finally {
      setLoading((prev) => ({ ...prev, resources: false }));
    }
  };

  const generateSuggestions = async () => {
    setLoading((prev) => ({ ...prev, suggestions: true }));
    try {
      const response = await generateAPI.resumeSuggestions({ resumeId });
      setSuggestions(response.data.suggestions);
      generated.setResumeSuggestions(resumeId, response.data.suggestions);
      toast.success("Resume suggestions updated!");
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading((prev) => ({ ...prev, suggestions: false }));
    }
  };

  const saveResource = async (skill, resource) => {
    try {
      await resourcesAPI.save({
        title: resource.title,
        link: resource.url,
        description: resource.summary || resource.description || "",
      });
      toast.success("Resource saved successfully!");
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("Failed to save resource");
    }
  };

  const markCompletion = async (skillName, resource, isCompleted) => {
    try {
      const skillGroup = resources.find((g) => g.skill === skillName);
      const skillTotal = skillGroup ? (skillGroup.resources?.length || null) : null;
      await progressAPI.mark({
        skillName,
        resourceLink: resource.url,
        isCompleted,
        skillTotal,
      });
      setProgress((prev) => ({ ...prev, [resource.url]: isCompleted }));
      if (isCompleted) toast.success("Marked as completed");
    } catch (e) {
      console.error("Error marking completion:", e);
      toast.error("Failed to update progress");
    }
  };

  const openViewer = (skillName, resource) => {
    setViewerResource({ ...resource, skillName });
    setViewerOpen(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "behavioral":
        return "bg-blue-100 text-blue-800";
      case "technical":
        return "bg-purple-100 text-purple-800";
      case "coding":
        return "bg-orange-100 text-orange-800";
      case "design":
        return "bg-pink-100 text-pink-800";
      case "aptitude":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getResourceTypeIcon = (type) => {
    switch (type) {
      case "video":
        return "🎥";
      case "article":
        return "📄";
      case "doc":
        return "📚";
      case "course":
        return "🎓";
      case "repo":
        return "💻";
      default:
        return "🔗";
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Resume not found
        </h2>
        <Link to="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interview Preparation</h1>
          <p className="text-gray-600 mt-2">
            Resume: {resume.parsedData?.name || "Unknown"} • Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('suggestions')} className="btn-secondary">Resume Suggestions</button>
          <Link to={`/resume-improver/${resumeId}`} className="btn-secondary">Open Resume Improver</Link>
          <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "questions", label: "Interview Questions", icon: HelpCircle },
            { id: "company", label: "Company Archive", icon: Building2 },
            { id: "resources", label: "Learning Resources", icon: BookOpen },
            { id: "suggestions", label: "Resume Suggestions", icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Interview Questions
              </h2>
              <p className="text-gray-600 mt-1">
                AI-generated questions tailored to your resume and JD
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

      {/* Resume Suggestions */}
      {activeTab === "suggestions" && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Resume Suggestions</h2>
              <p className="text-gray-600 mt-1">AI-based Professional Feedback based on your Resume and Job Description</p>
              {loadedFromCache.s && (
                <div className="text-xs text-gray-500 mt-1">Loaded from last session</div>
              )}
            </div>
            <button
              onClick={generateSuggestions}
              disabled={loading.suggestions}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {loading.suggestions ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <HelpCircle className="w-4 h-4" />
              )}
              <span>Regenerate Suggestions</span>
            </button>
          </div>

          {!suggestions ? (
            <div className="text-center py-12 text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Generating resume suggestions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Accordion Section Helper */}
              {[
                { key: 'missingSkills', title: '🧠 Missing Skills', items: suggestions.missingSkills },
                { key: 'contentImprovements', title: '✍️ Content Improvements', items: suggestions.contentImprovements },
                { key: 'keywordOptimization', title: '🔑 Keyword Optimization', items: suggestions.keywordOptimization },
                { key: 'formattingTone', title: '🧾 Formatting / Tone', items: suggestions.formattingTone },
              ].map((sec, idx) => (
                <Accordion key={sec.key} title={sec.title} defaultOpen={idx === 0}>
                  {(sec.items || []).length === 0 ? (
                    <div className="text-sm text-gray-600">No suggestions.</div>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                      {sec.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  )}
                </Accordion>
              ))}
            </div>
          )}
        </div>
      )}

      <ResourceViewer
        isOpen={viewerOpen}
        resource={viewerResource}
        onClose={() => setViewerOpen(false)}
        onConfirmComplete={() => {
          if (viewerResource) {
            markCompletion(viewerResource.skillName, viewerResource, true);
            setViewerOpen(false);
          }
        }}
      />
              <span>Regenerate</span>
            </button>
          </div>

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{q.question}</h3>
                    <div className="flex space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getTypeColor(
                          q.type
                        )}`}
                      >
                        {q.type}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(
                          q.difficulty
                        )}`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{q.rationale}</p>
                  {q.relatedSkills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {q.relatedSkills.map((s, j) => (
                        <span
                          key={j}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {s}
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
              <p>Generating questions...</p>
            </div>
          )}
        </div>
      )}

      {/* Company Archive */}
      {activeTab === "company" && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Company Archive
            </h2>
            <div className="flex space-x-4">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
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

          {!companyArchive ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Enter a company name to fetch questions</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {companyArchive.company || companyName}
                </h3>
                {companyArchive.note && (
                  <span className="text-sm text-gray-600">{companyArchive.note}</span>
                )}
              </div>
              {(companyArchive.rounds || []).length === 0 ? (
                <div className="text-gray-600">No prior questions found.</div>
              ) : (
                (companyArchive.rounds || []).map((round, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{round.roundName || `Round ${i + 1}`}</h4>
                    <div className="space-y-3">
                      {(round.questions || []).map((q, j) => (
                        <div key={j} className="bg-gray-50 rounded p-3">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-900">{q.question}</p>
                            <span className="text-xs text-gray-500">{typeof q.confidence === 'number' ? `${Math.round(q.confidence * 100)}%` : ''}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Source: {q.source || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Resources */}
      {activeTab === "resources" && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Learning Resources
              </h2>
              <p className="text-gray-600 mt-1">
                Curated dynamically from resume + JD skills
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
              <span>Regenerate</span>
            </button>
          </div>

          {resources.length > 0 ? (
            <div className="space-y-6">
              {resources.map((skillGroup, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md"
                >
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {skillGroup.skill}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {skillGroup.resources.map((r, j) => (
                      <div
                        key={j}
                        className="bg-gray-50 rounded-lg p-4 border hover:shadow-sm transition"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">
                            {getResourceTypeIcon(r.type)}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {r.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {r.summary}
                            </p>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                              >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => openViewer(skillGroup.skill, r)}
                                className="text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded px-2 py-1"
                              >
                                Open Viewer
                              </button>
                              <button
                                onClick={() => saveResource(skillGroup.skill, r)}
                                className="text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded px-2 py-1"
                              >
                                Save
                              </button>
                              <label className="flex items-center space-x-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={!!progress[r.url]}
                                  onChange={(e) => markCompletion(skillGroup.skill, r, e.target.checked)}
                                />
                                <span>Mark as Completed</span>
                              </label>
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
              <p>Generating skill-based resources...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
