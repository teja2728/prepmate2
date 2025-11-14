import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { geminiAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

const emptyProfile = {
  name: '',
  email: '',
  college: '',
  degree: '',
  year: '',
  skills: '', // comma-separated string in UI; send array in API
  goal: '',
  linkedin: '',
  github: '',
  profilePic: '',
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || '',
      email: user.email || '',
      college: user.college || '',
      degree: user.degree || '',
      year: user.year || '',
      skills: Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || ''),
      goal: user.goal || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      profilePic: user.profilePic || '',
    });
  }, [user]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, profilePic: reader.result }));
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: profile.name,
        college: profile.college,
        degree: profile.degree,
        year: profile.year,
        skills: profile.skills
          ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        goal: profile.goal,
        linkedin: profile.linkedin,
        github: profile.github,
        profilePic: profile.profilePic,
      };
      await userAPI.updateProfile(payload);
      toast.success('Profile updated');
    } catch (e) {
      console.error('Profile update error', e);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const onAnalyze = async () => {
    setAnalyzing(true);
    try {
      const payload = {
        ...profile,
        skills: profile.skills
          ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await geminiAPI.analyzeProfile(payload);
      const list = res?.data?.suggestions || [];
      setSuggestions(list);
      if (list.length) toast.success('Gemini insights ready');
    } catch (e) {
      console.error('Analyze profile error', e);
      toast.error('Failed to analyze profile');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container-page">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="p-6 rounded-2xl shadow-lg bg-gradient-to-r from-sky-100 to-indigo-100"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={profile.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'Student')}`}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-800">{profile.name || 'Your Name'}</h1>
              <p className="text-gray-700 text-sm">{profile.email || 'you@example.com'}</p>
              <div className="mt-3">
                <div className="text-xs text-gray-600 mb-1">Profile Completion</div>
                <div className="w-full bg-white/60 h-2 rounded-full overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${Math.min(100, [profile.college, profile.degree, profile.year, profile.skills, profile.goal].filter(Boolean).length * 20)}%` }} />
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              className="btn-primary text-sm"
              onClick={onSave}
              disabled={saving}
            >{saving ? 'Saving…' : 'Save Changes'}</motion.button>
          </div>
        </motion.div>

        {/* Form */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            className="lg:col-span-2 card bg-white/60 backdrop-blur-md"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                <input name="name" value={profile.name} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input name="email" value={profile.email} readOnly className="input-field opacity-70" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">College</label>
                <input name="college" value={profile.college} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Degree</label>
                <input name="degree" value={profile.degree} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Year of Study</label>
                <input name="year" value={profile.year} onChange={onChange} className="input-field" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Professional</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Skills (comma-separated)</label>
                <input name="skills" value={profile.skills} onChange={onChange} className="input-field" placeholder="React, Node, MongoDB" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Career Goal</label>
                <input name="goal" value={profile.goal} onChange={onChange} className="input-field" placeholder="e.g., Full-Stack Developer" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">LinkedIn</label>
                <input name="linkedin" value={profile.linkedin} onChange={onChange} className="input-field" placeholder="https://linkedin.com/in/username" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">GitHub</label>
                <input name="github" value={profile.github} onChange={onChange} className="input-field" placeholder="https://github.com/username" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Profile Picture</h3>
            <div className="flex items-center gap-4">
              <img
                src={profile.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'Student')}`}
                alt="preview"
                className="w-20 h-20 rounded-full object-cover border"
              />
              <label className="btn-secondary text-sm cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                Upload New
              </label>
            </div>
          </motion.div>

          {/* Gemini Panel */}
          <motion.div
            className="card bg-white/60 backdrop-blur-md"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gemini Career Insights</h3>
            <p className="text-sm text-gray-600 mb-3">AI suggestions based on your profile</p>
            <button className="btn-primary text-sm" onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? 'Analyzing…' : 'Analyze My Profile'}
            </button>
            <div className="mt-4 space-y-2">
              {(suggestions || []).length === 0 ? (
                <p className="text-sm text-gray-500">No insights yet.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                  {suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
