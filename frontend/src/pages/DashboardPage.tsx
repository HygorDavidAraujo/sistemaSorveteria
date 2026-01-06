import React, { useEffect, useState } from 'react';
import { useAuthStore, useCashSessionStore, useProductsStore, useCustomersStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card } from '@/components/common';
import { DollarSign, Users, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../pages/DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { currentSession, loadSession } = useCashSessionStore();
  const { products, loadProducts } = useProductsStore();
  const { customers, loadCustomers } = useCustomersStore();
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

  // Atualiza stats quando os stores mudam
  useEffect(() => {
    if (products.length > 0 || customers.length > 0) {
      setStats(prev => ({
        ...prev,
        totalCustomers: customers.length,
        totalProducts: products.length,
      }));
    }
  }, [products, customers]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const unwrap = (res: any) => res?.data ?? res;

      const [salesRes] = await Promise.all([
        apiClient.get('/sales'),
        loadSession(),
        loadProducts(),
        loadCustomers(),
      ]);

      const salesData = unwrap(salesRes)?.data ?? unwrap(salesRes) ?? [];
      const salesArray = Array.isArray(salesData) ? salesData : [];

      const totalRevenue = salesArray.reduce(
        (sum, sale: any) => sum + Number(sale?.totalAmount ?? sale?.total ?? 0),
        0
      );

      setStats({
        totalSales: salesArray.length,
        totalRevenue,
        totalCustomers: customers.length,
        totalProducts: products.length,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard__loading">
        <div className="dashboard__loading-spinner"></div>
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
            <div className="dashboard__card-icon dashboard__card-icon--blue">
              <DollarSign size={24} />
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
            <div className="dashboard__card-icon dashboard__card-icon--cyan">
              <ShoppingCart size={24} />
            </div>
            <span className="dashboard__card-badge">+8.2%</span>
          </div>
          <p className="dashboard__card-label">Vendas</p>
          <p className="dashboard__card-value">{stats.totalSales}</p>
        </div>

        {/* Customers Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon dashboard__card-icon--amber">
              <Users size={24} />
            </div>
            <span className="dashboard__card-badge">+5.1%</span>
          </div>
          <p className="dashboard__card-label">Clientes</p>
          <p className="dashboard__card-value">{stats.totalCustomers}</p>
        </div>

        {/* Products Card */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-icon dashboard__card-icon--purple">
              <Package size={24} />
            </div>
            <span className="dashboard__card-badge">Total</span>
          </div>
          <p className="dashboard__card-label">Produtos</p>
          <p className="dashboard__card-value">{stats.totalProducts}</p>
        </div>
      </div>

      {/* Cash Session */}
      {currentSession && currentSession.status === 'open' && (
        <div className="dashboard__cash-session">
          <div className="dashboard__cash-session-header">
            <div className="dashboard__cash-session-icon">
              <TrendingUp size={24} />
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

      {/* Cash Session Closed */}
      {(!currentSession || currentSession.status !== 'open') && (
        <div className="dashboard__cash-session" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
          <div className="dashboard__cash-session-header">
            <div className="dashboard__cash-session-icon" style={{ color: '#ef4444' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="dashboard__cash-session-title" style={{ color: '#7f1d1d' }}>Caixa Fechado</h3>
              <p className="dashboard__cash-session-subtitle" style={{ color: '#991b1b' }}>
                Nenhuma sessão de caixa ativa. Abra o caixa para iniciar operações.
              </p>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <a href="/cash" style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Abrir Caixa
            </a>
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
