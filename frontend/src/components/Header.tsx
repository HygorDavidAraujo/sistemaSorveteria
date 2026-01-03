import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { LogOut, Menu, Home, Package, Users, ShoppingCart, BarChart3, Settings, Bell, Clock } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-64 right-0 bg-white border-b border-gray-200 shadow-soft z-40">
      <div className="px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-gray-600">
              <Clock size={18} className="text-primary-500" />
              <span className="text-sm font-medium">
                {formatDistanceToNow(new Date(), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-900">Bem-vindo, {user?.fullName || user?.name || user?.email}</span>
                  <span className="text-xs text-gray-500 capitalize">{user?.role || 'user'}</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.fullName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>

              <button className="relative p-2 text-gray-600 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all duration-200">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-all duration-200 border border-red-200"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && user && (
          <nav className="mt-4 md:hidden flex flex-col gap-2 pt-4 border-t border-gray-100">
            <NavLink to="/" icon={<Home size={18} />} label="Dashboard" />
            <NavLink to="/sales" icon={<ShoppingCart size={18} />} label="Vendas" />
            <NavLink to="/products" icon={<Package size={18} />} label="Produtos" />
            <NavLink to="/customers" icon={<Users size={18} />} label="Clientes" />
            <NavLink to="/reports" icon={<BarChart3 size={18} />} label="Relatórios" />
            {user.role === 'admin' && (
              <NavLink to="/settings" icon={<Settings size={18} />} label="Configurações" />
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 font-medium"
  >
    {icon}
    {label}
  </Link>
);
