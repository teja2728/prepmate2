import { BarChart2, Bell, Bookmark, Home, LogOut, Menu, Upload, User, X } from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);
  
  return (
    <nav className="navbar sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-gray-900">PrepMate</span>
          </NavLink>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6 transition-colors">
              {[
                { to: '/dashboard', label: 'Dashboard', icon: Home },
                { to: '/saved-resources', label: 'Saved', icon: Bookmark },
                { to: '/upload', label: 'Upload', icon: Upload },
                { to: '/progress', label: 'Progress', icon: BarChart2 },
                { to: '/daily-challenge', label: 'Daily', icon: Bell },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `navbar-link flex items-center gap-2 transition-colors ${
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

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-800">{user?.name}</span>
                </div>
                <button onClick={logout} className="btn-secondary btn-icon">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive
                      ? 'btn-primary font-semibold'
                      : 'btn-primary opacity-80 hover:opacity-100'
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive
                      ? 'btn-primary font-semibold'
                      : 'btn-primary opacity-80 hover:opacity-100'
                  }
                >
                  Sign Up
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden pb-4 transition-all">
            {isAuthenticated && (
              <div className="flex flex-col gap-2">
                {[
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/saved-resources', label: 'Saved' },
                  { to: '/upload', label: 'Upload' },
                  { to: '/progress', label: 'Progress' },
                  { to: '/daily-challenge', label: 'Daily Challenge' },
                ].map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `navbar-link block px-3 py-2 rounded-md transition-colors ${
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
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="btn-secondary w-full"
                >
                  Logout
                </button>
              ) : (
                <>
                  <NavLink
                    onClick={() => setOpen(false)}
                    to="/login"
                    className={({ isActive }) =>
                      `btn-secondary w-full text-center transition-colors ${
                        isActive ? 'bg-gray-200 text-blue-700' : ''
                      }`
                    }
                  >
                    Login
                  </NavLink>
                  <NavLink
                    onClick={() => setOpen(false)}
                    to="/register"
                    className={({ isActive }) =>
                      `btn-primary w-full text-center transition-colors ${
                        isActive ? 'bg-blue-700' : ''
                      }`
                    }
                  >
                    Sign Up
                  </NavLink>
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
