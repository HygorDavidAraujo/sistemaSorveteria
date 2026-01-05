import React from 'react';
import { useAuthStore } from '@/store';
import { Card, Button, Alert } from '@/components/common';
import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await logout();
      navigate('/login');
    }
  };

  const handleExportData = () => {
    setSuccess('Dados exportados com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <Settings size={32} />
        <h1>Configurações</h1>
      </div>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* User Profile */}
      <Card>
        <h2 className="settings-section-title">Perfil do Usuário</h2>

        <div className="settings-info-grid">
          <div className="settings-info-item">
            <p className="settings-info-label">Nome</p>
            <p className="settings-info-value">{user?.name}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">Email</p>
            <p className="settings-info-value">{user?.email}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">Função</p>
            <p className="settings-info-value settings-role">{user?.role}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">ID do Usuário</p>
            <p className="settings-info-value settings-user-id">{user?.id}</p>
          </div>
        </div>

        <div className="settings-button-group">
          <Button variant="secondary">
            Editar Perfil
          </Button>
          <Button variant="secondary">
            Alterar Senha
          </Button>
        </div>
      </Card>

      {/* System Settings */}
      <Card>
        <h2 className="settings-section-title">Configurações do Sistema</h2>

        <div className="settings-options">
          <div className="settings-option-item">
            <div>
              <p className="settings-option-title">Tema Escuro</p>
              <p className="settings-option-description">Use tema escuro na interface</p>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" className="settings-toggle-input" title="Ativar tema escuro" />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          <div className="settings-option-item">
            <div>
              <p className="settings-option-title">Notificações</p>
              <p className="settings-option-description">Receber notificações de vendas</p>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" className="settings-toggle-input" defaultChecked title="Ativar notificações" />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          <div className="settings-option-item settings-select-container">
            <p className="settings-option-title">Idioma</p>
            <select className="settings-select" title="Selecionar idioma">
              <option>Português (Brasil)</option>
              <option>English</option>
              <option>Español</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h2 className="settings-section-title">Gerenciamento de Dados</h2>

        <div className="settings-data-management">
          <div className="settings-data-item">
            <p className="settings-data-title">Exportar Dados</p>
            <p className="settings-data-description">
              Baixe todos os seus dados em formato CSV
            </p>
            <Button
              variant="secondary"
              onClick={handleExportData}
            >
              Exportar Dados
            </Button>
          </div>

          <div className="settings-danger-zone">
            <p className="settings-danger-title">Zona de Perigo</p>
            <p className="settings-danger-description">
              Esta ação não pode ser desfeita. Todos os dados serão perdidos.
            </p>
            <Button variant="danger">
              Limpar Todos os Dados
            </Button>
          </div>
        </div>
      </Card>

      {/* Session Management */}
      <Card>
        <h2 className="settings-section-title">Gerenciar Sessão</h2>

        <div className="settings-session">
          <div className="settings-info-item">
            <p className="settings-info-label">Versão do Sistema</p>
            <p className="settings-info-value">1.0.0</p>
          </div>

          <Button
            variant="danger"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Fazer Logout
          </Button>
        </div>
      </Card>
    </div>
  );
};
