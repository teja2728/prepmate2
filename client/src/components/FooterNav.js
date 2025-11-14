import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Bookmark, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FooterNav = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  const itemCls = ({ isActive }) =>
    `flex flex-col items-center justify-center text-xs ${
      isActive ? 'text-blue-700' : 'text-gray-600'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 border-t border-gray-200 backdrop-blur-md md:hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-4 h-16">
          <NavLink to="/dashboard" className={itemCls} aria-label="Home">
            <Home className="w-5 h-5 mb-1" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/progress" className={itemCls} aria-label="Progress">
            <BarChart2 className="w-5 h-5 mb-1" />
            <span>Progress</span>
          </NavLink>
          <NavLink to="/saved-resources" className={itemCls} aria-label="Resources">
            <Bookmark className="w-5 h-5 mb-1" />
            <span>Resources</span>
          </NavLink>
          <NavLink to="/profile" className={itemCls} aria-label="Profile">
            <User className="w-5 h-5 mb-1" />
            <span>Profile</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default FooterNav;
