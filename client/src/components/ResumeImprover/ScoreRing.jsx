import React from 'react';
import { motion } from 'framer-motion';

const ScoreRing = ({ label, value = 0, color = '#3B82F6' }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm fill-gray-800 dark:fill-gray-100">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="text-xs mt-2 text-gray-700 dark:text-gray-300">{label}</div>
    </motion.div>
  );
};

export default ScoreRing;
