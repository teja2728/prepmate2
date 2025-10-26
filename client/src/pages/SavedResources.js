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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="loading-spinner"></div>
          <p className="mt-3 text-gray-600">Loading saved resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="mb-6">
        <h1 className="section-title">Saved Resources</h1>
        <p className="text-sm text-gray-600 mt-1">Your personal list of saved learning resources</p>
      </div>

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-700">No saved resources yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((r) => (
            <div key={r._id} className="card">
              <h3 className="font-semibold text-gray-900 mb-2">{r.title}</h3>
              <p className="text-sm text-gray-700 mb-4 line-clamp-2">{r.description}</p>
              <div className="flex items-center justify-between pt-3 border-t">
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline text-sm font-medium flex items-center gap-1"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => remove(r._id)} className="text-sm text-red-700 hover:underline flex items-center gap-2">
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
