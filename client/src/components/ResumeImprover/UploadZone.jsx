import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const UploadZone = ({ onUploaded, disabled }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (disabled) return;
    const form = new FormData();
    form.append('file', file);
    onUploaded && onUploaded({ form });
  }, [onUploaded, disabled]);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (disabled) return;
    const form = new FormData();
    form.append('file', file);
    onUploaded && onUploaded({ form });
  };

  const onPasteText = async (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    if (disabled) return;
    onUploaded && onUploaded({ text });
  };

  return (
    <motion.div
      className={`card border-dashed ${dragOver ? 'border-blue-400' : 'border-gray-200'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onPaste={onPasteText}
    >
      <div className="text-center py-6">
        <p className="text-sm text-gray-600">Drag & drop a PDF/DOCX/TXT, click to browse, or paste text</p>
        <div className="mt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >Choose File</button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={onPick}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">Max 8MB. Paste anywhere inside this box to use text.</p>
      </div>
    </motion.div>
  );
};

export default UploadZone;
