import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  Gift,
  TrendingUp,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <Home size={20} />,
      roles: ['admin', 'manager', 'operator', 'cashier'],
    },
    {
      label: 'Vendas',
      href: '/sales',
      icon: <ShoppingCart size={20} />,
      roles: ['admin', 'manager', 'operator', 'cashier'],
    },
    {
      label: 'Produtos',
      href: '/products',
      icon: <Package size={20} />,
      roles: ['admin', 'manager', 'operator'],
    },
    {
      label: 'Clientes',
      href: '/customers',
      icon: <Users size={20} />,
      roles: ['admin', 'manager', 'operator'],
    },
    {
      label: 'Caixa',
      href: '/cash',
      icon: <CreditCard size={20} />,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      label: 'Lealdade',
      href: '/loyalty',
      icon: <Gift size={20} />,
      roles: ['admin', 'manager', 'operator', 'cashier'],
    },
    {
      label: 'Relatórios',
      href: '/reports',
      icon: <BarChart3 size={20} />,
      roles: ['admin', 'manager'],
    },
    {
      label: 'Configurações',
      href: '/settings',
      icon: <Settings size={20} />,
      roles: ['admin'],
    },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 shadow-soft">
      {/* Logo Section */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-400 rounded-lg flex items-center justify-center text-white text-lg font-bold">
            🍦
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent">
              Sorveteria
            </h1>
            <p className="text-xs text-gray-500">Gestão Inteligente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                isActive(item.href)
                  ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-600 border-l-4 border-primary-500 shadow-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={isActive(item.href) ? 'text-primary-500' : 'text-gray-400'}>
                {item.icon}
              </span>
              {item.label}
              {item.href === '/sales' && (
                <Zap size={16} className="ml-auto text-yellow-500" />
              )}
            </Link>
          ))}
      </nav>

      {/* Footer Info */}
      <div className="px-4 py-4 border-t border-gray-100 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Sistema Online</span>
          </div>
          <div className="text-gray-500">v1.0.0</div>
        </div>
      </div>
    </aside>
  );
};
