import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { Lock, Mail, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading, clearError } = useAuthStore();
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-8">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary-200 to-transparent rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-secondary-200 to-transparent rounded-full opacity-10 translate-x-1/2 translate-y-1/2"></div>

      <div className="relative w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Header com gradiente */}
          <div className="h-2 bg-gradient-to-r from-primary-500 via-secondary-400 to-accent-400"></div>

          <div className="p-8 md:p-10">
            {/* Logo e Título */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl mb-4">
                <span className="text-4xl">🍦</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-1">
                Sorveteria
              </h1>
              <p className="text-gray-500 font-medium text-sm">Sistema de Gestão Inteligente</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-slideIn">
                  <div className="mt-0.5">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-600 font-medium text-sm">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={clearError}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all duration-200 font-medium"
                  />
                </div>
                <p className="text-xs text-gray-500">hygordavidaraujo@gmail.com</p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={clearError}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all duration-200 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.576l1.472-1.473a2.003 2.003 0 00-2.45-2.45l-1.513-1.514a4 4 0 014.491 4.437z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">admin123</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '12px 16px',
                  background: isLoading 
                    ? '#9CA3AF' 
                    : 'linear-gradient(90deg, #FF6B9D 0%, #E55A8C 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <LogIn size={20} />
                <span>{isLoading ? 'Conectando...' : 'Entrar no Sistema'}</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-2">Sistema de Gestão v1.0.0</p>
              <p className="text-xs text-gray-400">© 2026 Sorveteria - Todos os direitos reservados</p>
            </div>
          </div>
        </div>

        {/* Credenciais dica */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-yellow-200 shadow-sm">
          <p className="text-xs text-gray-600 mb-2 font-semibold">
            💡 Dica: Use as credenciais de teste
          </p>
          <div className="space-y-1 text-xs text-gray-500 font-mono bg-gray-50 p-3 rounded">
            <p><span className="text-gray-700 font-semibold">Email:</span> hygordavidaraujo@gmail.com</p>
            <p><span className="text-gray-700 font-semibold">Senha:</span> admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};
