import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MapPin,
  ClipboardList,
  Box,
  Truck,
  BarChart2,
  Activity,
  Users,
  Settings,
  LogOut,
  X,
  Warehouse
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/bin-locations', label: 'Bin Locations', icon: MapPin },
  { to: '/picking', label: 'Picking', icon: ClipboardList, roleRequired: ['picker', 'manager'] },
  { to: '/packing', label: 'Packing', icon: Box, roleRequired: ['packer', 'manager'] },
  { to: '/dispatch', label: 'Dispatch', icon: Truck, roleRequired: ['dispatch', 'manager'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart2, roleRequired: ['manager'] },
  { to: '/activity', label: 'Activity Logs', icon: Activity },
  { to: '/users', label: 'User Management', icon: Users, roleRequired: ['manager'] },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkBase =
    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150';
  const linkActive = 'bg-blue-600 text-white shadow-sm';
  const linkInactive = 'text-blue-100 hover:bg-white/10 hover:text-white';

  const userRole = user?.role || 'picker';

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roleRequired) return true;
    return item.roleRequired.includes(userRole) || userRole === 'manager';
  });

  return (
    <div
      className="flex h-full flex-col shadow-xl"
      style={{ backgroundColor: '#0f1d30' }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shadow">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight block leading-tight">
              StockPilot
            </span>
            <span className="text-[10px] text-blue-300 font-mono tracking-wider block">
              SMART FULFILMENT
            </span>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNavItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onClose}
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Mini Info */}
      <div className="px-4 py-3 bg-white/5 border-t border-white/10 mx-3 rounded-lg mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Staff'}</p>
            <p className="text-[10px] text-blue-300 capitalize truncate">{user?.role_display || user?.role}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className={`${linkBase} text-red-300 hover:bg-red-500/20 hover:text-red-200 w-full`}
        >
          <LogOut size={18} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
