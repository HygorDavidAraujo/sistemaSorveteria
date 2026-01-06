import React from 'react';
import { useAuthStore } from '@/store';
import { Card, Button, Alert } from '@/components/common';
import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './SettingsPage.css';
import { apiClient } from '@/services/api';

interface CompanyInfo {
  id?: string;
  cnpj: string;
  businessName: string;
  tradeName: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  logoUrl?: string;
}

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'company' | 'delivery'>('user');
  const [terminalId, setTerminalId] = useState<string>(
    localStorage.getItem('terminalId') || 'TERMINAL_01'
  );
  const [isEditingTerminal, setIsEditingTerminal] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    cnpj: '',
    businessName: '',
    tradeName: '',
    stateRegistration: '',
    municipalRegistration: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'GO',
    zipCode: '',
    email: '',
    phone: '',
    whatsapp: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (activeTab === 'company') {
      loadCompanyInfo();
    }
  }, [activeTab]);

  const loadCompanyInfo = async () => {
    try {
      setIsLoadingCompany(true);
      setError(null);
      const response = await apiClient.get('/settings/company-info');
      if (response.data && response.data.data) {
        setCompanyInfo(response.data.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar informações da empresa:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoadingCompany(true);
      setError(null);
      setSuccess(null);

      await apiClient.post('/settings/company-info', companyInfo);
      setSuccess('Informações da empresa atualizadas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar informações');
    } finally {
      setIsLoadingCompany(false);
    }
  };

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

  const handleSaveTerminal = () => {
    if (!terminalId.trim()) {
      alert('Por favor, informe o ID do terminal');
      return;
    }
    localStorage.setItem('terminalId', terminalId.trim());
    setIsEditingTerminal(false);
    setSuccess('Terminal configurado com sucesso! Recarregue a página para aplicar.');
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleCancelEditTerminal = () => {
    setTerminalId(localStorage.getItem('terminalId') || 'TERMINAL_01');
    setIsEditingTerminal(false);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="settings-page">
      <div className="page-header">
        <Settings size={32} />
        <h1>Configurações</h1>
      </div>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
          onClick={() => setActiveTab('user')}
        >
          👤 Usuário
        </button>
        <button
          className={`tab-button ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          ℹ️ Empresa
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivery')}
          >
            🚚 Entrega
          </button>
        )}
      </div>

      {/* User Profile Tab */}
      {activeTab === 'user' && (
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
      )}

      {/* System Settings */}
      {activeTab === 'user' && (
      <Card>
        <h2 className="settings-section-title">Configurações do Sistema</h2>

        <div className="settings-options">
          {/* Terminal Configuration - Admin Only */}
          {isAdmin && (
            <div className="settings-option-item" style={{ 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '2px solid #10b981'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                <div>
                  <p className="settings-option-title" style={{ color: '#059669', fontWeight: '600' }}>
                    🔧 Configuração de Terminal (Admin)
                  </p>
                  <p className="settings-option-description" style={{ marginTop: '0.25rem' }}>
                    Define o identificador único deste terminal/PDV
                  </p>
                </div>
                {!isEditingTerminal && (
                  <Button variant="secondary" onClick={() => setIsEditingTerminal(true)}>
                    Alterar
                  </Button>
                )}
              </div>

              {isEditingTerminal ? (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    ID do Terminal:
                  </label>
                  <input
                    type="text"
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                    placeholder="Ex: TERMINAL_01, PDV_LOJA_01"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      marginBottom: '1rem'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="primary" onClick={handleSaveTerminal}>
                      Salvar Terminal
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEditTerminal}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#ffffff',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                  color: '#059669',
                  fontSize: '1rem'
                }}>
                  {terminalId}
                </div>
              )}
            </div>
          )}

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
