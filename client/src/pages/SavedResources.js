import React, { useEffect, useState } from 'react';
import { resourcesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink } from 'lucide-react';

const SavedResources = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await resourcesAPI.getSaved();
      setItems(res.data.resources || []);
    } catch (e) {
      console.error('Failed to load saved resources', e);
      toast.error('Failed to load saved resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    try {
      await resourcesAPI.remove(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
      toast.success('Removed');
    } catch (e) {
      console.error('Failed to remove resource', e);
      toast.error('Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saved Resources</h1>
        <p className="text-gray-600 mt-2">Your personal list of saved learning resources</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No saved resources yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((r) => (
            <div key={r._id} className="bg-white rounded-lg p-4 border hover:shadow-sm transition">
              <h3 className="font-semibold text-gray-900 mb-2">{r.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{r.description}</p>
              <div className="flex items-center justify-between">
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => remove(r._id)} className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1">
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedResources;
