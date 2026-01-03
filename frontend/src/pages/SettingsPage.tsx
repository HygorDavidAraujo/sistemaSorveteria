import React from 'react';
import { useAuthStore } from '@/store';
import { Card, Button, Alert } from '@/components/common';
import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-dark mb-8 flex items-center gap-2">
        <Settings size={32} />
        Configurações
      </h1>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* User Profile */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Perfil do Usuário</h2>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">Nome</p>
            <p className="text-lg font-semibold">{user?.name}</p>
          </div>

          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>

          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">Função</p>
            <p className="text-lg font-semibold capitalize">{user?.role}</p>
          </div>

          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">ID do Usuário</p>
            <p className="text-lg font-mono text-gray-500">{user?.id}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1">
            Editar Perfil
          </Button>
          <Button variant="secondary" className="flex-1">
            Alterar Senha
          </Button>
        </div>
      </Card>

      {/* System Settings */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Configurações do Sistema</h2>

        <div className="space-y-4 mb-6">
          <div className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold">Tema Escuro</p>
              <p className="text-sm text-gray-600">Use tema escuro na interface</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="p-4 border rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold">Notificações</p>
              <p className="text-sm text-gray-600">Receber notificações de vendas</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="p-4 border rounded-lg">
            <p className="font-semibold mb-2">Idioma</p>
            <select className="w-full px-4 py-2 border rounded-lg">
              <option>Português (Brasil)</option>
              <option>English</option>
              <option>Español</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Gerenciamento de Dados</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <p className="font-semibold mb-2">Exportar Dados</p>
            <p className="text-sm text-gray-600 mb-4">
              Baixe todos os seus dados em formato CSV
            </p>
            <Button
              variant="secondary"
              onClick={handleExportData}
              className="w-full"
            >
              Exportar Dados
            </Button>
          </div>

          <div className="p-4 border border-danger rounded-lg bg-danger bg-opacity-5">
            <p className="font-semibold text-danger mb-2">Zona de Perigo</p>
            <p className="text-sm text-gray-600 mb-4">
              Esta ação não pode ser desfeita. Todos os dados serão perdidos.
            </p>
            <Button variant="danger" className="w-full">
              Limpar Todos os Dados
            </Button>
          </div>
        </div>
      </Card>

      {/* Session Management */}
      <Card>
        <h2 className="text-2xl font-bold mb-6">Gerenciar Sessão</h2>

        <div className="space-y-4">
          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">Versão do Sistema</p>
            <p className="text-lg font-semibold">1.0.0</p>
          </div>

          <Button
            variant="danger"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Fazer Logout
          </Button>
        </div>
      </Card>
    </div>
  );
};
