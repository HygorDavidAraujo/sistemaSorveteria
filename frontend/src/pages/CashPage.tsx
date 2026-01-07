import React, { useEffect, useState } from 'react';
import { useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { CreditCard, Play, Square } from 'lucide-react';
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

  const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

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

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 11px; margin: 5mm; width: 70mm; }
            .header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
            .header h1 { font-size: 14px; margin: 0 0 2mm 0; font-weight: bold; }
            .header p { margin: 1mm 0; font-size: 10px; }
            .section { margin: 3mm 0; padding: 2mm 0; }
            .section-title { font-weight: bold; margin-bottom: 2mm; border-bottom: 1px solid #ddd; padding-bottom: 1mm; }
            .row { display: flex; justify-content: space-between; margin: 2mm 0; }
            .highlight { font-weight: bold; font-size: 12px; }
            .footer { text-align: center; margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #000; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FECHAMENTO DE CAIXA</h1>
            <p>Terminal: ${sessionData.terminalId || 'TERMINAL_01'}</p>
            <p>Operador: ${operator}</p>
            <p>Abertura: ${openedAt}</p>
            <p>Fechamento: ${closedAt}</p>
          </div>

          <div class="section">
            <div class="section-title">Resumo</div>
            <div class="row"><span>Saldo de Abertura</span><span>${formatCurrency(initialCash)}</span></div>
            <div class="row"><span>Vendas - Dinheiro</span><span>${formatCurrency(totalCash)}</span></div>
            <div class="row"><span>Vendas - Cartão</span><span>${formatCurrency(totalCard)}</span></div>
            <div class="row"><span>Vendas - Pix</span><span>${formatCurrency(totalPix)}</span></div>
            <div class="row highlight"><span>Total de Vendas</span><span>${formatCurrency(totalSales)}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Conferência</div>
            <div class="row"><span>Esperado no Caixa</span><span>${formatCurrency(expectedCash)}</span></div>
            <div class="row"><span>Declarado (Fechamento)</span><span>${formatCurrency(declaredCash)}</span></div>
            <div class="row highlight"><span>Diferença</span><span>${formatCurrency(difference)}</span></div>
          </div>

          <div class="footer">
            <p>Assinatura: ___________________________</p>
            <p>Obrigado pelo trabalho!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.print();
    }
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
      setLoadingSessionTransactions(true);
      
      // Buscar sales e comandas em paralelo
      const [salesResponse, comandasResponse] = await Promise.all([
        apiClient.get(`/sales?cashSessionId=${sessionId}&limit=100`),
        apiClient.get(`/comandas?cashSessionId=${sessionId}&status=closed&limit=100`)
      ]);
      
      const salesData = salesResponse.data?.data || salesResponse.data || [];
      const sales = Array.isArray(salesData) ? salesData : [];
      
      const comandasData = comandasResponse.data?.data || comandasResponse.data || [];
      const comandas = Array.isArray(comandasData) ? comandasData : [];
      
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
        tableNumber: comanda.tableNumber
      }));
      
      // Combinar sales e comandas
      const allTransactions = [...sales, ...comandaTransactions];
      
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
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Carregando histórico...</p>
          </div>
        ) : cashSessions.length === 0 ? (
          <div className="cash-empty">
            <p>Nenhum histórico de caixa registrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Terminal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Usuário</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Abertura</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Fechamento</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Total de Vendas</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Ações</th>
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
                    <tr key={session.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', color: '#374151', fontWeight: '600' }}>
                        {session.terminalId || 'TERMINAL_01'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#374151' }}>
                        {typeof session.openedBy === 'object' ? (session.openedBy?.fullName || session.openedBy?.email || 'N/A') : (session.openedBy || 'N/A')}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#374151' }}>
                        {session.openedAt ? new Date(session.openedAt).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: isOpen ? '#9ca3af' : '#374151' }}>
                        {!isOpen && (session.closedAt || session.cashierClosedAt || session.managerClosedAt) 
                          ? new Date(session.closedAt || session.cashierClosedAt || session.managerClosedAt).toLocaleString('pt-BR') 
                          : (isOpen ? 'Aberto' : '-')}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669', fontWeight: '600' }} title={paymentDetails}>
                        R$ {typeof totalSales === 'number' && !isNaN(totalSales) ? totalSales.toFixed(2) : '0.00'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: isOpen ? '#dcfce7' : '#f3f4f6',
                          color: isOpen ? '#15803d' : '#374151'
                        }}>
                          {isOpen ? '🟢 Aberto' : '⚫ Fechado'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewSessionTransactions(session)}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginRight: '0.5rem'
                          }}
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
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Carregando vendas...</p>
          </div>
        ) : selectedSessionTransactions.length === 0 ? (
          <div className="cash-empty">
            <p>Nenhuma venda registrada nesta sessão</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb' }}>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Número</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Data/Hora</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Cliente</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Valor</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Método</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedSessionTransactions.map((transaction: any) => (
                  <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', color: '#374151' }}>
                      {transaction.saleType === 'comanda' ? (
                        <div>
                          <div style={{ fontWeight: '600', color: '#2563eb' }}>
                            Comanda #{transaction.comandaNumber}
                          </div>
                          {transaction.tableNumber && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Mesa {transaction.tableNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        `#${transaction.saleNumber || transaction.id.slice(0, 8)}`
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#374151' }}>
                      {transaction.saleDate ? new Date(transaction.saleDate).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#374151' }}>
                      {transaction.customer?.name || 'Consumidor Final'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                      R$ {parseFloat(transaction.total || transaction.totalAmount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#374151' }}>
                      {transaction.payments?.[0]?.paymentMethod || 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: transaction.status === 'completed' ? '#d1fae5' : '#fef3c7',
                        color: transaction.status === 'completed' ? '#065f46' : '#92400e'
                      }}>
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
