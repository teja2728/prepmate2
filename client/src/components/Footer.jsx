import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prepmate</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              A MERN placement prep app with AI-powered resume insights, daily challenges, and curated resources.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Dashboard</Link></li>
              <li><Link to="/daily-challenge" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Daily Challenge</Link></li>
              <li><Link to="/progress" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Progress</Link></li>
              <li><Link to="/saved-resources" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Saved Resources</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/profile" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Profile</Link></li>
              <li><Link to="/upload" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Upload Resume</Link></li>
              <li><Link to="/login" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Login</Link></li>
              <li><Link to="/register" className="text-gray-600 dark:text-gray-400 hover:text-blue-600">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-500">© {year} Prepmate. All rights reserved.</p>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            <a href="/api/health" className="hover:text-blue-600">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
