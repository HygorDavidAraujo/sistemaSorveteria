import React, { useEffect, useState } from 'react';
import { useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { CreditCard, Play, Square } from 'lucide-react';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
import './CashPage.css';

export const CashPage: React.FC = () => {
  const { currentSession, openSession, closeSession, loadSession } = useCashSessionStore();
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cashSessions, setCashSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [selectedSessionTransactions, setSelectedSessionTransactions] = useState<any[]>([]);
  const [selectedSessionForTransactions, setSelectedSessionForTransactions] = useState<any>(null);
  const [loadingSessionTransactions, setLoadingSessionTransactions] = useState(false);

  useEffect(() => {
    loadSession();
    loadCashSessionsHistory();
    setLoading(false);
  }, [loadSession]);

  const formatCurrencyLocal = (value: number) => formatCurrency(value);

  const handlePrintClosingReceipt = (sessionData: any, declaredCash: number) => {
    if (!sessionData) return;

    const initialCash = parseFloat(sessionData.initialCash || 0);
    const totalSales = parseFloat(sessionData.totalSales || 0);
    const totalCash = parseFloat(sessionData.totalCash || 0);
    const totalCard = parseFloat(sessionData.totalCard || 0);
    const totalPix = parseFloat(sessionData.totalPix || 0);
    const openedAt = sessionData.openedAt ? new Date(sessionData.openedAt).toLocaleString('pt-BR') : '-';
    const closedAtRaw = sessionData.closedAt || sessionData.cashierClosedAt || sessionData.managerClosedAt;
    const closedAt = closedAtRaw ? new Date(closedAtRaw).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    const expectedCash = initialCash + totalCash;
    const difference = declaredCash - expectedCash;
    const operator = typeof sessionData.openedBy === 'object'
      ? (sessionData.openedBy?.fullName || sessionData.openedBy?.email || 'Operador')
      : (sessionData.openedBy || 'Operador');

    const content = `
      <div class="print-header">
        <div class="print-header-title">FECHAMENTO DE CAIXA</div>
        <div class="print-header-subtitle">Gelatini - Gelados & Açaí</div>
        <div class="print-header-info">Terminal: ${sessionData.terminalId || 'TERMINAL_01'}</div>
        <div class="print-header-info">Operador: ${operator}</div>
        <div class="print-header-info">Abertura: ${openedAt}</div>
        <div class="print-header-info">Fechamento: ${closedAt}</div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Resumo de Vendas</div>
        <div class="print-row">
          <span class="print-row-label">Saldo de Abertura</span>
          <span class="print-row-value">${formatCurrencyLocal(initialCash)}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Vendas - Dinheiro</span>
          <span class="print-row-value">${formatCurrencyLocal(totalCash)}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Vendas - Cartão</span>
          <span class="print-row-value">${formatCurrencyLocal(totalCard)}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Vendas - Pix</span>
          <span class="print-row-value">${formatCurrencyLocal(totalPix)}</span>
        </div>
        <div class="print-row highlight total">
          <span class="print-row-label">TOTAL DE VENDAS</span>
          <span class="print-row-value">${formatCurrencyLocal(totalSales)}</span>
        </div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Conferência de Caixa</div>
        <div class="print-row">
          <span class="print-row-label">Esperado no Caixa</span>
          <span class="print-row-value">${formatCurrencyLocal(expectedCash)}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Declarado (Fechamento)</span>
          <span class="print-row-value">${formatCurrencyLocal(declaredCash)}</span>
        </div>
        <div class="print-row highlight total">
          <span class="print-row-label">DIFERENÇA</span>
          <span class="print-row-value">${formatCurrencyLocal(difference)}</span>
        </div>
      </div>

      <div class="print-section" style="margin-top: 8mm;">
        <div class="print-row" style="border-bottom: 1px solid #000; padding-bottom: 2mm;">
          <span>Assinado por: _________________</span>
        </div>
        <div class="print-row" style="font-size: 9px; margin-top: 3mm;">
          <span>Operador: _________________</span>
        </div>
        <div class="print-row" style="font-size: 9px;">
          <span>Gerente: _________________</span>
        </div>
      </div>

      <div class="print-footer">
        <div class="print-footer-text">Obrigado por seu trabalho!</div>
        <div class="print-footer-line">Documento para arquivo</div>
        <div class="print-footer-line" style="margin-top: 2mm;">Gelatini © 2024</div>
      </div>
    `;

    printReceipt({
      title: 'Fechamento de Caixa',
      subtitle: 'Gelatini - Gelados & Açaí',
      content
    });
  };

  const loadCashSessionsHistory = async () => {
    try {
      setLoadingSessions(true);
      const response = await apiClient.get('/cash-sessions/history?limit=100');
      const data = response.data?.data || response.data || [];
      setCashSessions(Array.isArray(data) ? data.reverse() : []);
    } catch (err) {
      console.error('Erro ao carregar histórico de sessões:', err);
      setCashSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadTransactionsForSession = async (sessionId: string) => {
    try {
      // Validar se sessionId é válido (UUID)
      if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
        console.error('sessionId inválido:', sessionId);
        setSelectedSessionTransactions([]);
        setLoadingSessionTransactions(false);
        return;
      }
      
      setLoadingSessionTransactions(true);
      
      // Buscar sales e comandas em paralelo com tratamento individual de erros
      const results = await Promise.allSettled([
        apiClient.get(`/sales?cashSessionId=${sessionId}&limit=100`),
        apiClient.get(`/comandas?cashSessionId=${sessionId}&status=closed&limit=100`),
        apiClient.get(`/delivery/orders?cashSessionId=${sessionId}&limit=100`),
      ]);
      
      // Verificar qual requisição falhou
      results.forEach((result, index) => {
        const endpoints = ['/sales', '/comandas', '/delivery/orders'];
        if (result.status === 'rejected') {
          console.error(`Erro ao carregar ${endpoints[index]}:`, result.reason?.response?.data || result.reason?.message);
        }
      });
      
      // Se todas falharem, não prosseguir
      if (results.every(r => r.status === 'rejected')) {
        throw new Error('Falha ao carregar todas as transações');
      }
      
      const salesResponse = results[0].status === 'fulfilled' ? results[0].value : null;
      const comandasResponse = results[1].status === 'fulfilled' ? results[1].value : null;
      const deliveryResponse = results[2].status === 'fulfilled' ? results[2].value : null;
      
      console.log('🔍 Delivery Response:', deliveryResponse);
      console.log('🔍 Delivery Response.data:', deliveryResponse?.data);
      
      const salesData = salesResponse?.data?.data || salesResponse?.data || [];
      const sales = Array.isArray(salesData) ? salesData : [];
      
      const comandasData = comandasResponse?.data?.data || comandasResponse?.data || [];
      const comandas = Array.isArray(comandasData) ? comandasData : [];

      const deliveryData = deliveryResponse?.data?.data || deliveryResponse?.data || [];
      const deliveryOrders = Array.isArray(deliveryData) ? deliveryData : [];
      
      console.log('🚚 Delivery Orders:', deliveryOrders);
      
      // Transformar comandas em formato de transação para exibição
      const comandaTransactions = comandas.map((comanda: any) => ({
        id: comanda.id,
        saleNumber: comanda.comandaNumber,
        saleDate: comanda.closedAt,
        customer: comanda.customer,
        total: comanda.total,
        totalAmount: comanda.total,
        payments: comanda.payments,
        status: 'completed',
        saleType: 'comanda',
        comandaNumber: comanda.comandaNumber,
        tableNumber: comanda.tableNumber,
      }));

      const deliveryTransactions = deliveryOrders.map((order: any) => ({
        id: order.id,
        saleNumber: order.orderNumber,
        saleDate: order.orderedAt,
        customer: order.customer,
        total: order.total,
        totalAmount: order.total,
        payments: order.payments,
        status: order.deliveryStatus || 'completed',
        saleType: 'delivery',
        deliveryStatus: order.deliveryStatus,
      }));
      
      // Combinar sales, comandas e delivery
      const allTransactions = [...sales, ...comandaTransactions, ...deliveryTransactions];
      
      // Ordenar por data (mais recente primeiro)
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.saleDate).getTime();
        const dateB = new Date(b.saleDate).getTime();
        return dateB - dateA;
      });
      
      setSelectedSessionTransactions(allTransactions);
    } catch (err) {
      console.error('Erro ao carregar transações da sessão:', err);
      setSelectedSessionTransactions([]);
    } finally {
      setLoadingSessionTransactions(false);
    }
  };

  const handleViewSessionTransactions = (session: any) => {
    setSelectedSessionForTransactions(session);
    setIsTransactionsModalOpen(true);
    loadTransactionsForSession(session.id);
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openSession(parseFloat(openingBalance));
      setSuccess('Caixa aberto com sucesso!');
      setIsOpenModalOpen(false);
      setOpeningBalance('');
      await loadCashSessionsHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao abrir caixa');
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedClosing = parseFloat(closingBalance);
    if (Number.isNaN(parsedClosing)) {
      setError('Informe um valor válido para o fechamento');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const closedSession = await closeSession(parsedClosing);
      setSuccess('Caixa fechado com sucesso!');
      setIsCloseModalOpen(false);
      setClosingBalance('');
      await loadSession();
      await loadCashSessionsHistory();
      handlePrintClosingReceipt(closedSession || currentSession, parsedClosing);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fechar caixa');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) return <Loading message="Carregando sessão de caixa..." />;

  return (
    <div className="cash-page">
      <div className="page-header">\n        <CreditCard size={32} />
        <h1>Gerenciar Caixa</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Session Status */}
      <Card>
        <div className="cash-session-header">
          <div>
            <h2 className="cash-session-title">Sessão de Caixa</h2>
            <p className="cash-session-status">
              Status:{' '}
              <strong>
                {currentSession?.status === 'open' ? (
                  <span className="cash-status-open">Aberta</span>
                ) : (
                  <span className="cash-status-closed">Fechada</span>
                )}
              </strong>
            </p>
          </div>

          {currentSession?.status === 'open' ? (
            <Button
              variant="danger"
              onClick={() => setIsCloseModalOpen(true)}
            >
              <Square size={18} />
              Fechar Caixa
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => setIsOpenModalOpen(true)}
            >
              <Play size={18} />
              Abrir Caixa
            </Button>
          )}
        </div>
      </Card>

      {/* Current Session Details */}
      {currentSession && (
        <div className="cash-grid">
          <Card>
            <div className="cash-balance-card">
              <p className="cash-balance-label">Saldo de Abertura</p>
              <p className="cash-balance-value">
                R$ {parseFloat(currentSession.initialCash || 0).toFixed(2)}
              </p>
            </div>
          </Card>

          <Card>
            <div className="cash-balance-card">
              <p className="cash-balance-label">Saldo Atual</p>
              <p className="cash-balance-value">
                R$ {(parseFloat(currentSession.initialCash || 0) + parseFloat(currentSession.totalSales || 0)).toFixed(2)}
              </p>
            </div>
          </Card>

          <Card>
            <div className="cash-balance-card">
              <p className="cash-balance-label">Total de Vendas</p>
              <p className="cash-balance-value">
                R$ {parseFloat(currentSession.totalSales || 0).toFixed(2)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Cash Sessions History */}
      <Card>
        <h3 className="cash-section-title">Histórico de Caixas</h3>
        {loadingSessions ? (
          <div className="cash-table-loading">
            <p>Carregando histórico...</p>
          </div>
        ) : cashSessions.length === 0 ? (
          <div className="cash-empty">
            <p>Nenhum histórico de caixa registrado</p>
          </div>
        ) : (
          <div className="cash-table-container">
            <table className="cash-table">
              <thead>
                <tr>
                  <th>Terminal</th>
                  <th>Usuário</th>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th className="text-right">Total de Vendas</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cashSessions.map((session: any) => {
                  // Usa o campo correto do backend: totalSales
                  const totalSales = parseFloat(session.totalSales || 0);
                  const totalCash = parseFloat(session.totalCash || 0);
                  const totalCard = parseFloat(session.totalCard || 0);
                  const totalPix = parseFloat(session.totalPix || 0);
                  const isOpen = session.status === 'open';
                  
                  // Monta detalhes dos pagamentos
                  const paymentDetails = `Dinheiro: R$ ${totalCash.toFixed(2)}\nCartão: R$ ${totalCard.toFixed(2)}\nPix: R$ ${totalPix.toFixed(2)}`;
                  
                  return (
                    <tr key={session.id}>
                      <td className="font-semibold">
                        {session.terminalId || 'TERMINAL_01'}
                      </td>
                      <td>
                        {typeof session.openedBy === 'object' ? (session.openedBy?.fullName || session.openedBy?.email || 'N/A') : (session.openedBy || 'N/A')}
                      </td>
                      <td>
                        {session.openedAt ? new Date(session.openedAt).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className={isOpen ? 'text-open' : ''}>
                        {!isOpen && (session.closedAt || session.cashierClosedAt || session.managerClosedAt) 
                          ? new Date(session.closedAt || session.cashierClosedAt || session.managerClosedAt).toLocaleString('pt-BR') 
                          : (isOpen ? 'Aberto' : '-')}
                      </td>
                      <td className="text-right text-success" title={paymentDetails}>
                        R$ {typeof totalSales === 'number' && !isNaN(totalSales) ? totalSales.toFixed(2) : '0.00'}
                      </td>
                      <td className="text-center">
                        <span className={`status-badge ${isOpen ? 'status-badge-open' : 'status-badge-closed'}`}>
                          {isOpen ? '🟢 Aberto' : '⚫ Fechado'}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleViewSessionTransactions(session)}
                          className="cash-table-action-btn"
                        >
                          📋 Vendas
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Transações da Sessão */}
      <Modal
        isOpen={isTransactionsModalOpen}
        title={`Vendas - ${selectedSessionForTransactions?.terminalId || 'Terminal'}`}
        onClose={() => setIsTransactionsModalOpen(false)}
      >
        {loadingSessionTransactions ? (
          <div className="cash-table-loading">
            <p>Carregando vendas...</p>
          </div>
        ) : selectedSessionTransactions.length === 0 ? (
          <div className="cash-empty">
            <p>Nenhuma venda registrada nesta sessão</p>
          </div>
        ) : (
          <div className="cash-modal-transactions">
            <table className="cash-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Data/Hora</th>
                  <th>Cliente</th>
                  <th className="text-right">Valor</th>
                  <th>Método</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedSessionTransactions.map((transaction: any) => (
                  <tr key={transaction.id}>
                    <td>
                      {transaction.saleType === 'comanda' ? (
                        <div>
                          <div className="transaction-badge transaction-badge-comanda">
                            Comanda #{transaction.comandaNumber}
                          </div>
                          {transaction.tableNumber && (
                            <div className="transaction-meta">
                              Mesa {transaction.tableNumber}
                            </div>
                          )}
                        </div>
                      ) : transaction.saleType === 'delivery' ? (
                        <div>
                          <div className="transaction-badge transaction-badge-delivery">
                            Delivery #{transaction.saleNumber}
                          </div>
                        </div>
                      ) : (
                        `#${transaction.saleNumber || transaction.id.slice(0, 8)}`
                      )}
                    </td>
                    <td>
                      {transaction.saleDate ? new Date(transaction.saleDate).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td>
                      {transaction.customer?.name || 'Consumidor Final'}
                    </td>
                    <td className="text-right text-success">
                      R$ {parseFloat(transaction.total || transaction.totalAmount || 0).toFixed(2)}
                    </td>
                    <td>
                      {transaction.payments?.[0]?.paymentMethod || 'N/A'}
                    </td>
                    <td>
                      <span className={`status-badge ${transaction.status === 'completed' ? 'status-badge-completed' : 'status-badge-open'}`}>
                        {transaction.status === 'completed' ? 'Completa' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Open Session Modal */}
      <Modal
        isOpen={isOpenModalOpen}
        title="Abrir Caixa"
        onClose={() => setIsOpenModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsOpenModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleOpenSession}
            >
              Abrir Caixa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenSession} className="cash-form">
          <Input
            label="Saldo de Abertura (R$)"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="cash-form-help">
            Informe o valor inicial em dinheiro que será utilizado no caixa.
          </p>
        </form>
      </Modal>

      {/* Close Session Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        title="Fechar Caixa"
        onClose={() => setIsCloseModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsCloseModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleCloseSession}
            >
              Fechar Caixa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCloseSession} className="cash-form">
          <div className="cash-form-info">
            <p className="cash-form-label">Saldo Atual do Caixa</p>
            <p className="cash-form-value">
              R$ {currentSession?.currentBalance?.toFixed(2) || '0.00'}
            </p>
          </div>

          <Input
            label="Saldo de Fechamento (R$)"
            type="number"
            step="0.01"
            value={closingBalance}
            onChange={(e) => setClosingBalance(e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="cash-form-help">
            Informe o valor total em dinheiro que está no caixa neste momento.
          </p>
        </form>
      </Modal>
    </div>
  );
};
