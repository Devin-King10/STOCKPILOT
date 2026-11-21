import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, User, Settings, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import SearchBar from './SearchBar';

export default function TopNav({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [delayedOrders, setDelayedOrders] = useState([]);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    dashboardAPI.getDelayedOrders()
      .then((res) => {
        setDelayedOrders(res.data.orders || []);
      })
      .catch((err) => {
        // silent fail on topnav
      });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notificationCount = delayedOrders.length;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      {/* Hamburger – visible on mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-md">
        <SearchBar placeholder="Search orders, products, barcodes..." />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Role Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          {user?.role_display || user?.role || 'Staff'}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen((v) => !v)}
            className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none animate-bounce">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl ring-1 ring-black/5 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Operational Alerts
                </p>
                <span className="text-[10px] font-mono text-gray-400">
                  {notificationCount} Active
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {delayedOrders.length > 0 ? (
                  delayedOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        navigate(`/orders/${ord.id}`);
                        setNotificationsOpen(false);
                      }}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            Delayed Order: {ord.order_number}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Pending for {ord.customer_name} ({ord.status})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400">
                    All fulfillment orders are on schedule. No delayed orders!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors text-sm"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 shadow-sm">
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="font-semibold text-gray-800 text-xs leading-tight truncate max-w-[130px]">
                {user?.full_name || user?.username}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight truncate max-w-[130px] capitalize">
                {user?.role_display || user?.role}
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl ring-1 ring-black/5 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-800 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-gray-400 truncate font-mono">@{user?.username}</p>
              </div>
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <User className="w-3.5 h-3.5 text-gray-500" /> My Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <Settings className="w-3.5 h-3.5 text-gray-500" /> Account Settings
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
