import React from 'react';
import { useAuthStore } from '@/store';
import { Card, Button, Alert, Modal, Input } from '@/components/common';
import { Settings, LogOut, Plus, Edit2, Power, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './SettingsPage.css';
import { apiClient } from '@/services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'cashier';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
}

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
  logoBase64?: string | null;
  logoMimeType?: string | null;
}

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // Calculate isAdmin early, before it's used in effects
  const isAdmin = user?.role === 'admin';
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'company' | 'delivery' | 'loyalty'>('user');
  const [terminalId, setTerminalId] = useState<string>(
    localStorage.getItem('terminalId') || 'TERMINAL_01'
  );
  const [isEditingTerminal, setIsEditingTerminal] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  
  // Helper functions for formatting
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 8);
  };
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier' as 'admin' | 'cashier',
  });
  
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
    logoBase64: null,
    logoMimeType: null,
  });

  // Loyalty/Cashback config state
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pointsPerReal: 1,
    minPurchaseForPoints: 0,
    pointsExpirationDays: 365,
    minPointsToRedeem: 100,
    pointsRedemptionValue: 0.01,
    applyToAllProducts: true,
    isActive: true,
  });

  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(false);
  const [cashbackConfig, setCashbackConfig] = useState({
    cashbackPercentage: 2,
    minPurchaseForCashback: 0,
    maxCashbackPerPurchase: null as number | null,
    cashbackExpirationDays: null as number | null,
    minCashbackToUse: 5,
    applyToAllProducts: true,
    isActive: true,
  });
  const [isLoadingCashback, setIsLoadingCashback] = useState(false);

  useEffect(() => {
    if (activeTab === 'user' && isAdmin && users.length === 0 && !isLoadingUsers) {
      loadUsers();
    }
    if (activeTab === 'company' && !companyInfo.cnpj && !isLoadingCompany) {
      loadCompanyInfo();
    }
    if (activeTab === 'loyalty' && !isLoadingLoyalty && loyaltyConfig.pointsPerReal === 1 && loyaltyConfig.pointsExpirationDays === 365) {
      loadLoyaltyConfig();
      loadCashbackConfig();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const result = await apiClient.get('/users');
      console.log('Users API response:', result);
      if (result && result.data) {
        setUsers(result.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setError(err.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadCompanyInfo = async () => {
    try {
      setIsLoadingCompany(true);
      setError(null);
      console.log('📥 Carregando informações da empresa...');
      const response = await apiClient.get('/settings/company-info');
      console.log('📦 Resposta recebida:', response);
      if (response && response.data) {
        const data = response.data;
        console.log('✅ Dados da empresa carregados:', data);
        setCompanyInfo(prev => ({
          ...prev,
          ...data,
          logoBase64: data.logoBase64 ?? null,
          logoMimeType: data.logoMimeType ?? null,
        }));
      } else {
        console.log('⚠️ Nenhum dado encontrado na resposta');
      }
    } catch (err: any) {
      console.error('❌ Erro ao carregar informações da empresa:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const loadLoyaltyConfig = async () => {
    if (isLoadingLoyalty) return; // Prevent duplicate calls
    try {
      setIsLoadingLoyalty(true);
      const response = await apiClient.get('/loyalty/config');
      if (response.data) {
        setLoyaltyConfig(response.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração de lealdade:', err);
      // Don't set error state for auto-load failures
    } finally {
      setIsLoadingLoyalty(false);
    }
  };

  const loadCashbackConfig = async () => {
    if (isLoadingCashback) return; // Prevent duplicate calls
    try {
      setIsLoadingCashback(true);
      const response = await apiClient.get('/cashback/config');
      if (response.data) {
        setCashbackConfig(response.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração de cashback:', err);
      // Don't set error state for auto-load failures
    } finally {
      setIsLoadingCashback(false);
    }
  };

  const handleSaveLoyaltyConfig = async () => {
    try {
      await apiClient.patch('/loyalty/config', loyaltyConfig);
      setSuccess('Configuração de lealdade salva com sucesso!');
      // Recarregar dados após salvar
      await loadLoyaltyConfig();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveCashbackConfig = async () => {
    try {
      await apiClient.patch('/cashback/config', cashbackConfig);
      setSuccess('Configuração de cashback salva com sucesso!');
      // Recarregar dados após salvar
      await loadCashbackConfig();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply formatting based on field name
    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'zipCode') {
      formattedValue = formatCEP(value);
    }
    
    setCompanyInfo(prev => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setCompanyInfo(prev => ({
        ...prev,
        logoBase64: base64,
        logoMimeType: file.type,
        logoUrl: '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoadingCompany(true);
      setError(null);
      setSuccess(null);

      console.log('📤 Enviando dados da empresa:', companyInfo);
      const response = await apiClient.post('/settings/company-info', companyInfo);
      console.log('✅ Resposta do servidor:', response);
      
      setSuccess('Informações da empresa atualizadas com sucesso!');
      
      // Recarregar dados após salvar
      await loadCompanyInfo();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('❌ Erro ao salvar:', err);
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

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setIsEditingUser(true);
      setSelectedUser(user);
      setUserForm({
        email: user.email,
        password: '',
        fullName: user.fullName,
        role: user.role,
      });
    } else {
      setIsEditingUser(false);
      setSelectedUser(null);
      setUserForm({
        email: '',
        password: '',
        fullName: '',
        role: 'cashier',
      });
    }
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setIsEditingUser(false);
    setSelectedUser(null);
    setUserForm({
      email: '',
      password: '',
      fullName: '',
      role: 'cashier',
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      if (isEditingUser && selectedUser) {
        // Update user
        const updateData: any = {
          email: userForm.email,
          fullName: userForm.fullName,
          role: userForm.role,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await apiClient.put(`/users/${selectedUser.id}`, updateData);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        // Create user
        await apiClient.post('/users', userForm);
        setSuccess('Usuário criado com sucesso!');
      }
      
      handleCloseUserModal();
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar usuário');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    try {
      setError(null);
      await apiClient.patch(`/users/${userId}/toggle-active`, {});
      setSuccess('Status do usuário alterado com sucesso!');
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao alterar status');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <>
    <div className="settings-page">
      <div className="page-header">
        <Settings size={32} />
        <h1>Configurações</h1>
      </div>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

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
          <>
            <button
              className={`tab-button ${activeTab === 'delivery' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivery')}
            >
              🚚 Entrega
            </button>
            <button
              className={`tab-button ${activeTab === 'loyalty' ? 'active' : ''}`}
              onClick={() => setActiveTab('loyalty')}
            >
              🎁 Fidelidade
            </button>
          </>
        )}
      </div>

      {/* User Management Tab */}
      {activeTab === 'user' && isAdmin && (
      <>
        <div className="settings-header">
          <h2 className="settings-section-title">Gerenciamento de Usuários</h2>
          <Button variant="primary" onClick={() => handleOpenUserModal()}>
            <Plus size={18} />
            Novo Usuário
          </Button>
        </div>

        {isLoadingUsers ? (
          <Card>
            <div className="settings-info-value">Carregando usuários...</div>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <div className="settings-info-value">Nenhum usuário cadastrado</div>
          </Card>
        ) : (
          <Card>
            <div className="settings-users-table-wrapper">
              <table className="settings-users-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Último Login</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id}>
                      <td>
                        <div className="settings-user-name">{userItem.fullName}</div>
                        {userItem.createdBy && (
                          <div className="settings-user-meta">
                            Criado por: {userItem.createdBy.fullName}
                          </div>
                        )}
                      </td>
                      <td>{userItem.email}</td>
                      <td>
                        <span className={`settings-role-badge settings-role-${userItem.role}`}>
                          {userItem.role === 'admin' ? 'Administrador' : 'Caixa'}
                        </span>
                      </td>
                      <td>
                        <span className={`settings-status-badge ${userItem.isActive ? 'active' : 'inactive'}`}>
                          {userItem.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        {userItem.lastLoginAt 
                          ? new Date(userItem.lastLoginAt).toLocaleString('pt-BR')
                          : 'Nunca'
                        }
                      </td>
                      <td>
                        <div className="settings-table-actions">
                          <button
                            className="settings-action-btn settings-action-edit"
                            onClick={() => handleOpenUserModal(userItem)}
                            title="Editar usuário"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className={`settings-action-btn ${userItem.isActive ? 'settings-action-deactivate' : 'settings-action-activate'}`}
                            onClick={() => handleToggleUserActive(userItem.id)}
                            title={userItem.isActive ? 'Desativar' : 'Ativar'}
                            disabled={userItem.id === user?.id}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* User Info Card */}
        <Card>
          <h2 className="settings-section-title">Meu Perfil</h2>
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
              <p className="settings-info-value settings-role">{user?.role === 'admin' ? 'Administrador' : 'Caixa'}</p>
            </div>
            <div className="settings-info-item">
              <p className="settings-info-label">ID do Usuário</p>
              <p className="settings-info-value settings-user-id">{user?.id}</p>
            </div>
          </div>
        </Card>
      </>
      )}

      {/* User Profile Tab (for non-admin) */}
      {activeTab === 'user' && !isAdmin && (
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
            <p className="settings-info-value settings-role">{user?.role === 'admin' ? 'Administrador' : 'Caixa'}</p>
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
            <div className="settings-option-item settings-terminal-config">
              <div className="settings-terminal-header">
                <div>
                  <p className="settings-option-title settings-terminal-title">
                    🔧 Configuração de Terminal (Admin)
                  </p>
                  <p className="settings-option-description settings-terminal-description">
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
                <div className="settings-terminal-edit-wrapper">
                  <label className="settings-terminal-label">
                    ID do Terminal:
                  </label>
                  <input
                    type="text"
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                    placeholder="Ex: TERMINAL_01, PDV_LOJA_01"
                    className="settings-terminal-input"
                  />
                  <div className="settings-terminal-buttons">
                    <Button variant="primary" onClick={handleSaveTerminal}>
                      Salvar Terminal
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEditTerminal}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="settings-terminal-display">
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
      )}

      {/* Data Management */}
      {activeTab === 'user' && (
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
      )}

      {/* Session Management */}
      {activeTab === 'user' && (
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
      )}

      {/* Company Info Tab */}
      {activeTab === 'company' && (
      <Card>
        <h2 className="settings-section-title">Informações da Empresa</h2>
        
        {isLoadingCompany ? (
          <div className="settings-info-value">Carregando...</div>
        ) : (
          <form onSubmit={handleCompanyInfoSubmit} className="settings-company-form">
            {/* Dados da Empresa */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📋 Dados da Empresa</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={companyInfo.cnpj}
                    onChange={handleCompanyInfoChange}
                    placeholder="00.000.000/0000-00"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Razão Social *</label>
                  <input
                    type="text"
                    name="businessName"
                    value={companyInfo.businessName}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome empresarial"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Nome Fantasia *</label>
                  <input
                    type="text"
                    name="tradeName"
                    value={companyInfo.tradeName}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome comercial"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Inscrição Estadual</label>
                  <input
                    type="text"
                    name="stateRegistration"
                    value={companyInfo.stateRegistration || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="000.000.000.000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Inscrição Municipal</label>
                  <input
                    type="text"
                    name="municipalRegistration"
                    value={companyInfo.municipalRegistration || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="00000000"
                    className="settings-form-input"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📍 Endereço</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">CEP *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={companyInfo.zipCode}
                    onChange={handleCompanyInfoChange}
                    placeholder="00000-000"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Rua *</label>
                  <input
                    type="text"
                    name="street"
                    value={companyInfo.street}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome da rua"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Número *</label>
                  <input
                    type="text"
                    name="number"
                    value={companyInfo.number}
                    onChange={handleCompanyInfoChange}
                    placeholder="123"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Complemento</label>
                  <input
                    type="text"
                    name="complement"
                    value={companyInfo.complement || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="Sala, andar, etc"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Bairro *</label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={companyInfo.neighborhood}
                    onChange={handleCompanyInfoChange}
                    placeholder="Bairro"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Cidade *</label>
                  <input
                    type="text"
                    name="city"
                    value={companyInfo.city}
                    onChange={handleCompanyInfoChange}
                    placeholder="Cidade"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Estado *</label>
                  <input
                    type="text"
                    name="state"
                    value={companyInfo.state}
                    onChange={handleCompanyInfoChange}
                    placeholder="UF"
                    maxLength={2}
                    className="settings-form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contatos */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📞 Contatos</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={companyInfo.email || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="contato@empresa.com.br"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Telefone</label>
                  <input
                    type="text"
                    name="phone"
                    value={companyInfo.phone || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="(00) 0000-0000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={companyInfo.whatsapp || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="(00) 00000-0000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="logoUrl">URL da Logo</label>
                  <input
                    type="text"
                    id="logoUrl"
                    name="logoUrl"
                    value={companyInfo.logoUrl || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="https://exemplo.com/logo.png"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="logoFile">Upload da Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    id="logoFile"
                    title="Selecionar arquivo da logo"
                    aria-label="Selecionar arquivo da logo"
                    placeholder="Escolha a logo"
                    onChange={handleLogoFileChange}
                    className="settings-form-input"
                  />
                  {(companyInfo.logoBase64 || companyInfo.logoUrl) && (
                    <div className="settings-logo-preview">
                      <img
                        src={companyInfo.logoBase64 ? `data:${companyInfo.logoMimeType || 'image/png'};base64,${companyInfo.logoBase64}` : companyInfo.logoUrl}
                        alt="Logo da empresa"
                        className="settings-logo-img"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-form-actions">
              <Button type="submit" variant="primary" disabled={isLoadingCompany}>
                {isLoadingCompany ? 'Salvando...' : 'Salvar Informações'}
              </Button>
              <Button type="button" variant="secondary" onClick={loadCompanyInfo}>
                Recarregar
              </Button>
            </div>
          </form>
        )}
      </Card>
      )}

      {/* Delivery Settings Tab */}
      {activeTab === 'delivery' && isAdmin && (
      <Card>
        <h2 className="settings-section-title">Configurações de Entrega</h2>
        
        <div className="settings-delivery-form">
          {/* Taxa de Entrega */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">🚚 Taxa de Entrega</p>
                <p className="settings-delivery-option-description">
                  Configure as taxas de entrega por distância ou região
                </p>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" className="settings-toggle-input" defaultChecked title="Ativar taxa de entrega" />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Taxa Padrão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Taxa por Km (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Distância Grátis (Km)</label>
                <input
                  type="number"
                  placeholder="5"
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Tempo de Entrega */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">⏱️ Tempo de Entrega</p>
                <p className="settings-delivery-option-description">
                  Defina o tempo estimado de entrega
                </p>
              </div>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Tempo Mínimo (min)</label>
                <input
                  type="number"
                  placeholder="30"
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Tempo Máximo (min)</label>
                <input
                  type="number"
                  placeholder="60"
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Pedido Mínimo */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">💰 Pedido Mínimo</p>
                <p className="settings-delivery-option-description">
                  Valor mínimo para aceitar pedidos de entrega
                </p>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" className="settings-toggle-input" title="Ativar pedido mínimo" />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="25.00"
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Raio de Entrega */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">📍 Raio de Entrega</p>
                <p className="settings-delivery-option-description">
                  Distância máxima que você entrega
                </p>
              </div>
              <label className="settings-toggle">
                <input type="checkbox" className="settings-toggle-input" title="Ativar limite de raio" />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Raio Máximo (Km)</label>
                <input
                  type="number"
                  placeholder="10"
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">🕐 Horário de Entrega</p>
                <p className="settings-delivery-option-description">
                  Configure os horários de funcionamento para entregas
                </p>
              </div>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Abertura</label>
                <input
                  type="time"
                  className="settings-form-input"
                  defaultValue="08:00"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Fechamento</label>
                <input
                  type="time"
                  className="settings-form-input"
                  defaultValue="22:00"
                />
              </div>
            </div>
          </div>

          <div className="settings-form-actions">
            <Button variant="primary">
              Salvar Configurações
            </Button>
            <Button variant="secondary">
              Restaurar Padrões
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Loyalty & Cashback Tab */}
      {activeTab === 'loyalty' && isAdmin && (
      <>
        <Card>
          <h2 className="settings-section-title">⭐ Programa de Pontos de Lealdade</h2>
          <div className="settings-option">
            <div className="settings-option-header">
              <div>
                <p className="settings-option-title">Ativar Programa de Pontos</p>
                <p className="settings-option-description">
                  Clientes ganham pontos a cada compra que podem ser trocados por descontos
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  checked={loyaltyConfig.isActive}
                  onChange={(e) => setLoyaltyConfig({...loyaltyConfig, isActive: e.target.checked})}
                  className="settings-toggle-input" 
                  title="Ativar/Desativar programa de pontos" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
          </div>

          {loyaltyConfig.isActive && (
            <>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Pontos por R$ 1,00</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyConfig.pointsPerReal}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsPerReal: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="1"
                  />
                  <small className="settings-form-hint">Ex: 1 = cliente ganha 1 ponto a cada R$1 gasto</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Compra Mínima para Pontos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyConfig.minPurchaseForPoints}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, minPurchaseForPoints: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Validade dos Pontos (dias)</label>
                  <input
                    type="number"
                    value={loyaltyConfig.pointsExpirationDays}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsExpirationDays: parseInt(e.target.value) || 365})}
                    className="settings-form-input"
                    placeholder="365"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Pontos Mínimos para Resgatar</label>
                  <input
                    type="number"
                    value={loyaltyConfig.minPointsToRedeem}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, minPointsToRedeem: parseInt(e.target.value) || 100})}
                    className="settings-form-input"
                    placeholder="100"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Valor de Cada Ponto (R$)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={loyaltyConfig.pointsRedemptionValue}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsRedemptionValue: parseFloat(e.target.value) || 0.01})}
                    className="settings-form-input"
                    placeholder="0.01"
                  />
                  <small className="settings-form-hint">Ex: 0.01 = cada ponto vale R$0,01</small>
                </div>
              </div>

              <div className="settings-option">
                <label className="settings-checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={loyaltyConfig.applyToAllProducts}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, applyToAllProducts: e.target.checked})}
                  />
                  <span>Aplicar a todos os produtos</span>
                </label>
                <p className="settings-option-description">
                  {loyaltyConfig.applyToAllProducts 
                    ? 'Todas as vendas geram pontos. Desmarque para escolher produtos específicos no cadastro de produtos.'
                    : 'Apenas produtos marcados como "Elegível para Lealdade" geram pontos.'
                  }
                </p>
              </div>

              <div className="settings-form-actions">
                <Button variant="primary" onClick={handleSaveLoyaltyConfig}>
                  Salvar Configurações de Pontos
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="settings-section-title">💰 Programa de Cashback</h2>
          <div className="settings-option">
            <div className="settings-option-header">
              <div>
                <p className="settings-option-title">Ativar Cashback</p>
                <p className="settings-option-description">
                  Clientes recebem um percentual de volta em dinheiro para usar em próximas compras
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  checked={cashbackConfig.isActive}
                  onChange={(e) => setCashbackConfig({...cashbackConfig, isActive: e.target.checked})}
                  className="settings-toggle-input" 
                  title="Ativar/Desativar cashback" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
          </div>

          {cashbackConfig.isActive && (
            <>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Percentual de Cashback (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.cashbackPercentage}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, cashbackPercentage: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="2.00"
                  />
                  <small className="settings-form-hint">Ex: 2 = cliente recebe 2% do valor da compra</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Compra Mínima para Cashback (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.minPurchaseForCashback}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, minPurchaseForCashback: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Cashback Máximo por Compra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.maxCashbackPerPurchase || ''}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, maxCashbackPerPurchase: e.target.value ? parseFloat(e.target.value) : null})}
                    className="settings-form-input"
                    placeholder="Sem limite"
                  />
                  <small className="settings-form-hint">Deixe em branco para sem limite</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Validade do Cashback (dias)</label>
                  <input
                    type="number"
                    value={cashbackConfig.cashbackExpirationDays || ''}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, cashbackExpirationDays: e.target.value ? parseInt(e.target.value) : null})}
                    className="settings-form-input"
                    placeholder="Sem validade"
                  />
                  <small className="settings-form-hint">Deixe em branco para cashback sem validade</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Cashback Mínimo para Usar (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.minCashbackToUse}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, minCashbackToUse: parseFloat(e.target.value) || 5})}
                    className="settings-form-input"
                    placeholder="5.00"
                  />
                </div>
              </div>

              <div className="settings-option">
                <label className="settings-checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={cashbackConfig.applyToAllProducts}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, applyToAllProducts: e.target.checked})}
                  />
                  <span>Aplicar a todos os produtos</span>
                </label>
                <p className="settings-option-description">
                  {cashbackConfig.applyToAllProducts 
                    ? 'Todas as vendas geram cashback. Desmarque para escolher produtos específicos no cadastro de produtos.'
                    : 'Apenas produtos marcados como "Gera Cashback" concedem cashback. Você pode definir % específico por produto.'
                  }
                </p>
              </div>

              <div className="settings-form-actions">
                <Button variant="primary" onClick={handleSaveCashbackConfig}>
                  Salvar Configurações de Cashback
                </Button>
              </div>
            </>
          )}
        </Card>
      </>
      )}
    </div>

    {/* User Modal */}
    <Modal
      isOpen={isUserModalOpen}
      title={isEditingUser ? 'Editar Usuário' : 'Novo Usuário'}
      onClose={handleCloseUserModal}
      footer={
        <div className="modal-footer">
          <Button variant="secondary" onClick={handleCloseUserModal}>
            <X size={18} />
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleUserSubmit}>
            <Check size={18} />
            {isEditingUser ? 'Atualizar' : 'Criar Usuário'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleUserSubmit} className="settings-user-form">
        <div className="settings-form-section">
          <div className="settings-form-group">
            <label className="settings-form-label">Nome Completo *</label>
            <input
              type="text"
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              className="settings-form-input"
              required
              placeholder="Nome completo do usuário"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">E-mail *</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="settings-form-input"
              required
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">
              Senha {isEditingUser && '(deixe em branco para manter)'}
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="settings-form-input"
              required={!isEditingUser}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Função *</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'cashier' })}
              className="settings-form-input"
              required
              title="Selecione a função do usuário"
            >
              <option value="cashier">Caixa</option>
              <option value="admin">Administrador</option>
            </select>
            <div className="settings-form-hint">
              <strong>Caixa:</strong> Abre/fecha caixa, vendas PDV, comandas, delivery, cadastra clientes e imprime comprovantes.
              <br />
              <strong>Administrador:</strong> Acesso total ao sistema sem restrições.
            </div>
          </div>
        </div>
      </form>
    </Modal>
  </>
  );
};
