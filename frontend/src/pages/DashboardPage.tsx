import React, { useEffect, useState } from 'react';
import { useAuthStore, useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card } from '@/components/common';
import { DollarSign, Users, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../pages/DashboardPage.css';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await loadSession();

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <h1 className="dashboard__title">Dashboard</h1>
        <p className="dashboard__date">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="dashboard__grid">
        {/* Revenue Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon blue">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <span className="dashboard__card-badge">+12.5%</span>
          </div>
          <p className="dashboard__card-label">Faturamento</p>
          <p className="dashboard__card-value">
            R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Sales Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon cyan">
              <ShoppingCart className="text-cyan-600" size={24} />
            </div>
            <span className="dashboard__card-badge">+8.2%</span>
          </div>
          <p className="dashboard__card-label">Vendas</p>
          <p className="dashboard__card-value">{stats.totalSales}</p>
        </div>

        {/* Customers Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon amber">
              <Users className="text-amber-600" size={24} />
            </div>
            <span className="dashboard__card-badge">+5.1%</span>
          </div>
          <p className="dashboard__card-label">Clientes</p>
          <p className="dashboard__card-value">{stats.totalCustomers}</p>
        </div>

        {/* Products Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon purple">
              <Package className="text-purple-600" size={24} />
            </div>
            <span className="dashboard__card-badge">Total</span>
          </div>
          <p className="dashboard__card-label">Produtos</p>
          <p className="dashboard__card-value">{stats.totalProducts}</p>
        </div>
      </div>

      {/* Cash Session */}
      {currentSession && (
        <div className="dashboard__cash-session">
          <div className="dashboard__cash-session-header">
            <div className="dashboard__cash-session-icon">
              <TrendingUp className="text-green-700" size={24} />
            </div>
            <div>
              <h3 className="dashboard__cash-session-title">Caixa Aberto</h3>
              <p className="dashboard__cash-session-subtitle">
                Aberto em {format(new Date(currentSession.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="dashboard__cash-grid">
            <div className="dashboard__cash-item">
              <p className="dashboard__cash-item-label">Saldo Inicial</p>
              <p className="dashboard__cash-item-value">
                R$ {currentSession?.initialCash?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="dashboard__cash-item">
              <p className="dashboard__cash-item-label">Total Vendas</p>
              <p className="dashboard__cash-item-value">
                R$ {currentSession?.totalSales?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="dashboard__cash-item">
              <p className="dashboard__cash-item-label">Saldo Atual</p>
              <p className="dashboard__cash-item-value">
                R$ {currentSession?.totalCash?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard__actions">
        <h2 className="dashboard__actions-title">Ações Rápidas</h2>
        <div className="dashboard__actions-grid">
          <a href="/sales" className="dashboard__action-btn blue">
            <ShoppingCart size={28} />
            <div>
              <div>Nova Venda</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Iniciar processo</div>
            </div>
          </a>

          <a href="/products" className="dashboard__action-btn cyan">
            <Package size={28} />
            <div>
              <div>Produtos</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Gerenciar catálogo</div>
            </div>
          </a>

          <a href="/customers" className="dashboard__action-btn amber">
            <Users size={28} />
            <div>
              <div>Clientes</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Cadastros e fidelidade</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
