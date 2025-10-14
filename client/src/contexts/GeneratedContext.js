import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'generatedCache';

const GeneratedContext = createContext();

export const useGenerated = () => {
  const ctx = useContext(GeneratedContext);
  if (!ctx) throw new Error('useGenerated must be used within a GeneratedProvider');
  return ctx;
};

export const GeneratedProvider = ({ children }) => {
  const [cache, setCache] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {}
  }, [cache]);

  // Clear cache on logout
  useEffect(() => {
    const handler = () => {
      setCache({});
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };
    window.addEventListener('prepmate:logout', handler);
    return () => window.removeEventListener('prepmate:logout', handler);
  }, []);

  const api = useMemo(() => ({
    get(resumeId) {
      return cache[resumeId] || null;
    },
    setQuestions(resumeId, questions) {
      setCache((c) => ({ ...c, [resumeId]: { ...(c[resumeId] || {}), questions, questionsAt: Date.now() } }));
    },
    setCompanyArchive(resumeId, archive) {
      setCache((c) => ({ ...c, [resumeId]: { ...(c[resumeId] || {}), companyArchive: archive, companyAt: Date.now() } }));
    },
    setResources(resumeId, resources) {
      setCache((c) => ({ ...c, [resumeId]: { ...(c[resumeId] || {}), resources, resourcesAt: Date.now() } }));
    },
    setResumeSuggestions(resumeId, resumeSuggestions) {
      setCache((c) => ({ ...c, [resumeId]: { ...(c[resumeId] || {}), resumeSuggestions, suggestionsAt: Date.now() } }));
    },
    setResumeImprovement(resumeId, resumeImprovement) {
      setCache((c) => ({ ...c, [resumeId]: { ...(c[resumeId] || {}), resumeImprovement, improverAt: Date.now() } }));
    },
    clearAll() {
      setCache({});
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    },
  }), [cache]);

  return (
    <GeneratedContext.Provider value={api}>
      {children}
    </GeneratedContext.Provider>
  );
};
