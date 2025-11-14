import { BarChart2, Bell, Bookmark, Home, LogOut, Menu, Upload, User, X, Sun, Moon } from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);

  const { theme, toggleTheme } = useTheme();
  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-gray-900">PrepMate</span>
          </NavLink>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop Links */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6">
              {[
                { to: '/dashboard', label: 'Dashboard', icon: Home },
                { to: '/saved-resources', label: 'Saved', icon: Bookmark },
                { to: '/upload', label: 'Upload', icon: Upload },
                { to: '/progress', label: 'Progress', icon: BarChart2 },
                { to: '/daily-challenge', label: 'Daily', icon: Bell },
                { to: '/profile', label: user?.name || 'Profile', icon: User }, // 👈 replaced label with user's name
              ].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'text-blue-700 font-semibold border-b-2 border-blue-600 pb-2'
                        : 'text-gray-700 hover:text-blue-600'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}

          {/* Right side buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="btn-secondary p-2 rounded-lg"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
                
                {/* 🟢 Gradient Logout Button */}
                <button
                  onClick={logout}
                  className="px-4 py-2 text-white font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </div>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <NavLink to="/login" className="btn-primary">Login</NavLink>
                <NavLink to="/register" className="btn-primary">Sign Up</NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden pb-4">
            {isAuthenticated && (
              <div className="flex flex-col gap-2">
                {[
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/saved-resources', label: 'Saved' },
                  { to: '/upload', label: 'Upload' },
                  { to: '/progress', label: 'Progress' },
                  { to: '/daily-challenge', label: 'Daily Challenge' },
                  { to: '/profile', label: user?.name || 'Profile' }, // 👈 user's name here too
                ].map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md ${
                        isActive
                          ? 'text-blue-700 font-semibold bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="btn-secondary flex-1 text-center"
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="w-full text-white font-semibold rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-2 hover:opacity-90 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="btn-secondary w-full text-center">Login</NavLink>
                  <NavLink to="/register" className="btn-primary w-full text-center">Sign Up</NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
