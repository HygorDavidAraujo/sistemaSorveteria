import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
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
  Truck,
  ArrowUpDown,
  FolderTree,
  FileMinus,
  FilePlus,
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { companyInfo, getLogoUrl } = useCompanyInfo();
  const location = useLocation();

  if (!user) return null;

  const sections = [
    {
      title: 'Geral',
      items: [
        {
          label: 'Dashboard',
          href: '/',
          icon: <Home size={20} />,
          roles: ['admin', 'manager', 'operator', 'cashier'],
        },
      ],
    },
    {
      title: 'Vendas',
      items: [
        {
          label: 'PDV / Vendas',
          href: '/sales',
          icon: <ShoppingCart size={20} />,
          roles: ['admin', 'manager', 'operator', 'cashier'],
        },
        {
          label: 'Caixa',
          href: '/cash',
          icon: <CreditCard size={20} />,
          roles: ['admin', 'manager', 'cashier'],
        },
        {
          label: 'Comandas',
          href: '/comandas',
          icon: <FileText size={20} />,
          roles: ['admin', 'manager', 'cashier'],
        },
        {
          label: 'Delivery',
          href: '/delivery',
          icon: <Truck size={20} />,
          roles: ['admin', 'manager', 'cashier'],
        },
      ],
    },
    {
      title: 'Cadastros',
      items: [
        {
          label: 'Categorias de Produtos',
          href: '/product-categories',
          icon: <FolderTree size={20} />,
          roles: ['admin', 'manager', 'operator'],
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
      ],
    },
    {
      title: 'Marketing',
      items: [
        {
          label: 'Lealdade',
          href: '/loyalty',
          icon: <Gift size={20} />,
          roles: ['admin', 'manager', 'operator', 'cashier'],
        },
        {
          label: 'Cupons',
          href: '/coupons',
          icon: <Tag size={20} />,
          roles: ['admin', 'manager'],
        },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        {
          label: 'Transações',
          href: '/financial/transactions',
          icon: <ArrowUpDown size={20} />,
          roles: ['admin', 'manager'],
        },
        {
          label: 'Categorias',
          href: '/financial/categories',
          icon: <FolderTree size={20} />,
          roles: ['admin', 'manager'],
        },
        {
          label: 'Contas a Pagar',
          href: '/financial/accounts-payable',
          icon: <FileMinus size={20} />,
          roles: ['admin', 'manager'],
        },
        {
          label: 'Contas a Receber',
          href: '/financial/accounts-receivable',
          icon: <FilePlus size={20} />,
          roles: ['admin', 'manager'],
        },
        {
          label: 'Formas de Pagamento',
          href: '/financial/payment-methods',
          icon: <CreditCard size={20} />,
          roles: ['admin', 'manager'],
        },
        {
          label: 'Relatórios',
          href: '/reports',
          icon: <BarChart3 size={20} />,
          roles: ['admin', 'manager'],
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          label: 'Configurações',
          href: '/settings',
          icon: <Settings size={20} />,
          roles: ['admin'],
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-text">
          <h1>{companyInfo?.tradeName || 'GELATINI'}</h1>
          <p>Gestão</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user?.role || '')
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="sidebar__section">
              <div className="sidebar__section-title">{section.title}</div>
              {visibleItems.map((item) => {
                const active = isActive(item.href);
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
            </div>
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
