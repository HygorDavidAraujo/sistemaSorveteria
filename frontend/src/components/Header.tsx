import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { LogOut } from 'lucide-react';
import './Header.css';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { companyInfo, getLogoUrl } = useCompanyInfo();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      {user && (
        <div className="header__content">
          <div className="header__brand">
            <div className="header__logo-icon">
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl()!}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                'G'
              )}
            </div>
          </div>

          <div className="header__actions">
            <div className="header__user-info">
              <p className="header__user-name">
                Bem-vindo, {user?.fullName || user?.name || user?.email}
              </p>
              <p className="header__user-role">{user?.role || 'user'}</p>
            </div>
            
            <div className="header__avatar">
              {(user?.fullName?.charAt(0) || user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="header__logout-btn"
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
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
    className="header__nav-link"
  >
    {icon}
    {label}
  </Link>
);
