import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Note: Due to cross-origin restrictions, we cannot inspect iframe inner scroll.
// Best-practice UX: Detect scroll to bottom of the modal container (instructions + iframe area)
// and/or a minimal dwell time, then prompt for confirmation to mark completion.

const ResourceViewer = ({ isOpen, onClose, resource, onConfirmComplete }) => {
  const containerRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShowConfirm(false);

    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        setShowConfirm(true);
      }
    };

    el.addEventListener('scroll', onScroll);

    // Fallback: reveal after 20s dwell
    const t = setTimeout(() => setShowConfirm(true), 20000);

    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(t);
    };
  }, [isOpen]);

  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{resource.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{resource.summary || resource.description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={containerRef} className="overflow-auto p-4 space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              You are viewing this resource in a viewer. For the best experience, you can also
              open it in a new tab. Scroll to the bottom to enable completion prompt.
            </p>
            <a
              href={resource.url || resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Open in new tab
            </a>
          </div>

          <div className="border rounded-lg overflow-hidden h-[60vh]">
            <iframe
              src={resource.url || resource.link}
              title={resource.title}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>

          {showConfirm && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-green-800 font-medium mb-2">
                You’ve reached the end of this resource. Mark this skill as completed?
              </p>
              <div className="flex space-x-3">
                <button
                  className="btn-primary"
                  onClick={() => onConfirmComplete?.()}
                >
                  Yes, I’ve Completed
                </button>
                <button className="btn-secondary" onClick={onClose}>Not Yet</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceViewer;
