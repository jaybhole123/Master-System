import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, LogOut, Menu, X, LineChart, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import { getDisplayableImageUrl } from '../utils/imageUtils';

const AdminLayout = () => {
  const { user, logout, updateProfileImage } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file");
        return;
      }

      setIsUpdating(true);
      setError(null);
      const result = await updateProfileImage(file);
      setIsUpdating(false);

      if (result.success) {
        setProfilePopupOpen(false);
      } else {
        setError(result.error || "Failed to update image");
      }
    }
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (sidebarOpen) setSidebarOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 fixed top-0 left-0 right-0 z-30 h-16 shadow-xs">
        <div className="px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to={(user?.role === 'admin' || user?.role === 'superadmin') ? '/admin/dashboard' : '/user/dashboard'} className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-blue-500/20 tracking-wider">
                M
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">MIS</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  user?.role === 'superadmin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : (user?.role === 'admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                  }`}>
                  {user?.role || 'USER'}
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {user && (
              <div className="relative">
                <div
                  className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-full hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200"
                  onClick={() => setProfilePopupOpen(!profilePopupOpen)}
                >
                  <img
                    src={getDisplayableImageUrl(user.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff&bold=true`}
                    alt={user.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs flex-shrink-0"
                  />
                  <div className="hidden md:flex flex-col text-left pr-1">
                    <span className="text-sm font-semibold text-slate-800 leading-tight truncate max-w-32 lg:max-w-none">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-slate-400 capitalize">{user.role || 'Member'}</span>
                  </div>
                </div>

                {/* Profile Popup */}
                {profilePopupOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfilePopupOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
                      <div className="p-5">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative group">
                            <img
                              src={getDisplayableImageUrl(user.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff`}
                              alt={user.name}
                              className="w-20 h-20 rounded-full object-cover border-4 border-blue-50"
                            />
                            {isUpdating && (
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              </div>
                            )}
                          </div>
                          <h3 className="mt-3 font-bold text-gray-800 text-lg">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.designation || user.role}</p>
                          <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                        </div>

                        <div className="mt-6 space-y-3">
                          <label className="block">
                            <span className="sr-only">Choose profile photo</span>
                            <div className={`w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${isUpdating
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95'
                              }`}>
                              {isUpdating ? 'Updating...' : 'Change Image'}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                              disabled={isUpdating}
                            />
                          </label>

                          {error && (
                            <p className="text-xs text-red-500 text-center font-medium animate-pulse">{error}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 border-t border-gray-100">
                        <button
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 transition-colors"
            >
              <LogOut size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline-block text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16 sm:pt-18">
        {/* Sidebar */}
        <aside
          className={`w-60 bg-white border-r border-slate-200 fixed top-16 bottom-10 sm:bottom-11 left-0 z-20 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-sm ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="h-full overflow-y-auto mobile-scroll py-4 px-3 flex flex-col justify-between">
            <nav className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Menu
              </div>
              <Link
                to={(user?.role === 'admin' || user?.role === 'superadmin') ? "/admin/dashboard" : "/user/dashboard"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${(isActive('/admin/dashboard') || isActive('/user/dashboard'))
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                onClick={closeSidebar}
              >
                <LayoutDashboard size={19} className="shrink-0" />
                <span className="truncate">Dashboard</span>
              </Link>
              <Link
                to={(user?.role === 'admin' || user?.role === 'superadmin') ? "/admin/history-commitment" : "/user/history-commitment"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${(isActive('/admin/history-commitment') || isActive('/user/history-commitment'))
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                onClick={closeSidebar}
              >
                <History size={19} className="shrink-0" />
                <span className="truncate">History</span>
              </Link>
              <Link
                to={(user?.role === 'admin' || user?.role === 'superadmin') ? "/admin/kpi-kra" : "/user/kpi-kra"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${(isActive('/admin/kpi-kra') || isActive('/user/kpi-kra'))
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                onClick={closeSidebar}
              >
                <LineChart size={19} className="shrink-0" />
                <span className="truncate">KPI & KRA</span>
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full min-w-0 ml-0 lg:ml-60 pb-12 overflow-x-hidden overflow-y-auto mobile-scroll">
          <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Fixed Footer */}
      <Footer />

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;