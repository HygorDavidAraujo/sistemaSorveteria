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
  FileText,
  Tag,
} from 'lucide-react';
import './Sidebar.css';

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
      label: 'Comandas',
      href: '/comandas',
      icon: <FileText size={20} />,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      label: 'Cupons',
      href: '/coupons',
      icon: <Tag size={20} />,
      roles: ['admin', 'manager'],
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
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">G</div>
        <div className="sidebar__logo-text">
          <h1>GELATINI</h1>
          <p>Gestão</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          if (item.roles && !item.roles.includes(user?.role || '')) return null;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`sidebar__nav-link ${active ? 'active' : ''}`}
            >
              <span className="sidebar__nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="sidebar__footer">
        <div className="sidebar__user-info">
          <p>Conectado como:</p>
          <p>{user?.name || user?.email}</p>
        </div>
      </div>
    </aside>
  );
};
