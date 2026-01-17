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
    revenueChangePct: null as number | null,
    salesChangePct: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Atualiza stats quando os stores mudam
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalCustomers: customers.length,
      totalProducts: products.length,
    }));
  }, [products, customers]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      const prevMonthIndex = now.getMonth() - 1;
      const prevYear = prevMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevMonth = prevMonthIndex < 0 ? 11 : prevMonthIndex;
      const prevMonthDays = new Date(prevYear, prevMonth + 1, 0).getDate();
      const prevEndDay = Math.min(now.getDate(), prevMonthDays);
      const prevStart = new Date(prevYear, prevMonth, 1);
      const prevEnd = new Date(prevYear, prevMonth, prevEndDay, 23, 59, 59, 999);

      const startDate = currentStart.toISOString();
      const endDate = currentEnd.toISOString();
      const prevStartDate = prevStart.toISOString();
      const prevEndDate = prevEnd.toISOString();

      await Promise.all([loadSession(), loadProducts(), loadCustomers()]);

      // IMPORTANT: Cash session totals include PDV + Comandas + Delivery.
      // Dashboard "Faturamento" should reflect the gross revenue for the month,
      // counting only CLOSED cash sessions (cashier_closed + manager_closed).
      const limit = 100;

      const sumRevenueByStatus = async (
        status: 'cashier_closed' | 'manager_closed',
        rangeStart: string,
        rangeEnd: string
      ) => {
        let page = 1;
        let totalPages = 1;
        let subtotal = 0;

        do {
          const sessionsResp: any = await apiClient.get('/cash-sessions/history', {
            params: {
              startDate: rangeStart,
              endDate: rangeEnd,
              status,
              page,
              limit,
            },
          });

          const sessionsArray = Array.isArray(sessionsResp?.data) ? sessionsResp.data : [];
          const pagination = sessionsResp?.pagination;

          for (const session of sessionsArray) {
            subtotal += Number(session?.totalSales ?? 0);
          }

          totalPages = Number(pagination?.totalPages ?? 1);
          page += 1;
        } while (page <= totalPages);

        return subtotal;
      };

      const [cashierClosedRevenue, managerClosedRevenue, prevCashierClosedRevenue, prevManagerClosedRevenue] =
        await Promise.all([
          sumRevenueByStatus('cashier_closed', startDate, endDate),
          sumRevenueByStatus('manager_closed', startDate, endDate),
          sumRevenueByStatus('cashier_closed', prevStartDate, prevEndDate),
          sumRevenueByStatus('manager_closed', prevStartDate, prevEndDate),
        ]);

      const totalRevenue = cashierClosedRevenue + managerClosedRevenue;
      const prevTotalRevenue = prevCashierClosedRevenue + prevManagerClosedRevenue;

      const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

      const [currentSalesModules, prevSalesModules] = await Promise.all([
        apiClient.getSalesByModuleReport(startDate, endDate),
        apiClient.getSalesByModuleReport(prevStartDate, prevEndDate),
      ]);
      const salesCurrent = unwrap(currentSalesModules);
      const salesPrev = unwrap(prevSalesModules);
      const totalSales = Number(salesCurrent?.totals?.count ?? 0);
      const prevTotalSales = Number(salesPrev?.totals?.count ?? 0);

      const calcChangePct = (current: number, previous: number) => {
        if (previous <= 0) return null;
        return ((current - previous) / previous) * 100;
      };

      const revenueChangePct = calcChangePct(totalRevenue, prevTotalRevenue);
      const salesChangePct = calcChangePct(totalSales, prevTotalSales);

      setStats(prev => ({
        ...prev,
        totalSales,
        totalRevenue,
        revenueChangePct,
        salesChangePct,
      }));
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

  const formatChangePct = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getBadgeClass = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return 'dashboard__card-badge dashboard__card-badge--neutral';
    if (value < 0) return 'dashboard__card-badge dashboard__card-badge--negative';
    return 'dashboard__card-badge dashboard__card-badge--positive';
  };

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
            <span className={getBadgeClass(stats.revenueChangePct)}>
              {formatChangePct(stats.revenueChangePct)}
            </span>
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
            <span className={getBadgeClass(stats.salesChangePct)}>
              {formatChangePct(stats.salesChangePct)}
            </span>
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
