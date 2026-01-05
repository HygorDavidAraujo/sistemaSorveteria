import React, { useEffect, useState } from 'react';
import { useCashSessionStore } from '@/store';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { CreditCard, Play, Square } from 'lucide-react';
import './CashPage.css';

export const CashPage: React.FC = () => {
  const { currentSession, openSession, closeSession, loadSession } = useCashSessionStore();
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
    setLoading(false);
  }, [loadSession]);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openSession(parseFloat(openingBalance));
      setSuccess('Caixa aberto com sucesso!');
      setIsOpenModalOpen(false);
      setOpeningBalance('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao abrir caixa');
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await closeSession(parseFloat(closingBalance));
      setSuccess('Caixa fechado com sucesso!');
      setIsCloseModalOpen(false);
      setClosingBalance('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fechar caixa');
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
                R$ {currentSession.openingBalance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </Card>

          <Card>
            <div className="cash-balance-card">
              <p className="cash-balance-label">Saldo Atual</p>
              <p className="cash-balance-value">
                R$ {currentSession.currentBalance?.toFixed(2) || '0.00'}
              </p>
            </div>
          </Card>

          <Card>
            <div className="cash-balance-card">
              <p className="cash-balance-label">Variação</p>
              <p className="cash-balance-value">
                R${' '}
                {(
                  (currentSession.currentBalance || 0) - (currentSession.openingBalance || 0)
                ).toFixed(2)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <h3 className="cash-section-title">Histórico de Transações</h3>
        <div className="cash-empty">
          <p>Nenhuma transação registrada ainda</p>
        </div>
      </Card>

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
