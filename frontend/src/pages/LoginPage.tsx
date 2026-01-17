import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { Lock, Mail, LogIn } from 'lucide-react';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading, clearError } = useAuthStore();
  const { companyInfo, getLogoUrl } = useCompanyInfo();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    try {
      await login(email, password);
      console.log('Login completed, redirecting...');
      // Force redirect
      window.location.href = '/';
    } catch (err) {
      console.error('Login failed:', err);
      // Error handled by store
    }
  };

  return (
    <div className="login">
      {/* Background decorative elements */}
      <div className="login__bg-decoration login__bg-decoration--top-left"></div>
      <div className="login__bg-decoration login__bg-decoration--bottom-right"></div>

      <div className="login__container">
        {/* Card Principal */}
        <div className="login__card">
          {/* Header com gradiente */}
          <div className="login__card-header"></div>

          <div className="login__card-body">
            {/* Logo e Título */}
            <div className="login__logo-section">
              <div className="login__logo-icon">
                {getLogoUrl() ? (
                  <img src={getLogoUrl()!} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span>🍦</span>
                )}
              </div>
              <h1 className="login__title">{companyInfo?.tradeName || 'Sorveteria'}</h1>
              <p className="login__subtitle">Sistema de Gestão Inteligente</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="login__form">
              {/* Error Alert */}
              {error && (
                <div className="login__error">
                  <svg className="login__error-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="login__error-message">{error}</p>
                  <button
                    type="button"
                    onClick={clearError}
                    className="login__error-close"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Email Input */}
              <div className="login__form-group">
                <label htmlFor="email" className="login__label">
                  Email
                </label>
                <div className="login__input-wrapper">
                  <Mail className="login__input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={clearError}
                    placeholder="seu@email.com"
                    required
                    className="login__input"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="login__form-group">
                <label htmlFor="password" className="login__label">
                  Senha
                </label>
                <div className="login__input-wrapper">
                  <Lock className="login__input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={clearError}
                    placeholder="••••••••"
                    required
                    className="login__input login__input--with-toggle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login__input-toggle"
                  >
                    {showPassword ? (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.576l1.472-1.473a2.003 2.003 0 00-2.45-2.45l-1.513-1.514a4 4 0 014.491 4.437z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="login__submit"
              >
                <LogIn size={20} />
                <span>{isLoading ? 'Conectando...' : 'Entrar no Sistema'}</span>
              </button>
            </form>

            {/* Footer */}
            <div className="login__footer">
              <p className="login__footer-version">Sistema de Gestão v1.0.0</p>
              <p className="login__footer-copyright">© 2026 Sorveteria - Todos os direitos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
