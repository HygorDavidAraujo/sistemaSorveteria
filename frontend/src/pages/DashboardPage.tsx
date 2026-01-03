import React, { useEffect, useState } from 'react';
import { useAuthStore, useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { DollarSign, Users, ShoppingCart, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentSession, loadSession } = useCashSessionStore();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [todayReport, setTodayReport] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await loadSession();

      // Get today's report
      const today = format(new Date(), 'yyyy-MM-dd');
      const report = await apiClient.getDailyReport(today);
      setTodayReport(report);

      // Mock stats - replace with actual API calls
      setStats({
        totalSales: Math.floor(Math.random() * 100) + 20,
        totalRevenue: Math.floor(Math.random() * 5000) + 1000,
        totalCustomers: Math.floor(Math.random() * 200) + 50,
        totalProducts: 25,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Cash Session Alert */}
      {!currentSession && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-yellow-600" size={20} />
            <p className="text-yellow-800 font-medium">
              Nenhum caixa aberto. Abra um caixa para começar a vender.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <DollarSign className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
              +12.5%
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Faturamento</h3>
          <p className="text-2xl font-bold text-gray-900">
            R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Sales Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary-400 to-secondary-500 flex items-center justify-center">
              <ShoppingCart className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
              +8.2%
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Vendas Hoje</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
        </div>

        {/* Customers Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-400 to-accent-500 flex items-center justify-center">
              <Users className="text-gray-900" size={24} />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              +15.3%
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Clientes</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
        </div>

        {/* Products Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Package className="text-white" size={24} />
            </div>
            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
              Total
            </span>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Produtos</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>
      </div>

      {/* Session Info */}
      {currentSession && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Caixa Aberto</h3>
              <p className="text-sm text-gray-600">
                Aberto em {format(new Date(currentSession.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Saldo Inicial</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {currentSession.initialAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total em Vendas</p>
              <p className="text-xl font-bold text-green-600">
                R$ {currentSession.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Saldo Atual</p>
              <p className="text-xl font-bold text-primary-600">
                R$ {(currentSession.initialAmount + currentSession.totalSales).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/sales"
          className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
        >
          <ShoppingCart size={28} className="mb-3" />
          <h3 className="text-lg font-bold mb-1">Nova Venda</h3>
          <p className="text-sm opacity-90">Iniciar processo de venda</p>
        </a>
        
        <a
          href="/products"
          className="bg-gradient-to-br from-secondary-400 to-secondary-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
        >
          <Package size={28} className="mb-3" />
          <h3 className="text-lg font-bold mb-1">Produtos</h3>
          <p className="text-sm opacity-90">Gerenciar catálogo</p>
        </a>
        
        <a
          href="/customers"
          className="bg-gradient-to-br from-accent-400 to-accent-500 rounded-xl p-6 text-gray-900 hover:shadow-lg transition-shadow"
        >
          <Users size={28} className="mb-3" />
          <h3 className="text-lg font-bold mb-1">Clientes</h3>
          <p className="text-sm opacity-90">Cadastros e fidelidade</p>
        </a>
      </div>
    </div>
  );
};
