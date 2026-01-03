import React from 'react';
import { LogIn } from 'lucide-react';

interface LoginButtonProps {
  isLoading?: boolean;
  onClick?: (e: React.FormEvent) => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({ isLoading = false, onClick }) => {
  return (
    <button
      type="submit"
      disabled={isLoading}
      onClick={onClick}
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
      onMouseEnter={(e) => {
        if (!isLoading) {
          (e.target as HTMLButtonElement).style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.2)';
          (e.target as HTMLButtonElement).style.opacity = '0.95';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          (e.target as HTMLButtonElement).style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
          (e.target as HTMLButtonElement).style.opacity = '1';
        }
      }}
    >
      <LogIn size={20} />
      <span>{isLoading ? 'Conectando...' : 'Entrar no Sistema'}</span>
    </button>
  );
};
