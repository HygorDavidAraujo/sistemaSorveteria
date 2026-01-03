import React, { useEffect, useState } from 'react';
import { useCashSessionStore } from '@/store';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { CreditCard, Play, Square } from 'lucide-react';

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-dark mb-8 flex items-center gap-2">
        <CreditCard size={32} />
        Gerenciar Caixa
      </h1>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Session Status */}
      <Card className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Sessão de Caixa</h2>
            <p className="text-gray-600 mt-2">
              Status: <strong>
                {currentSession?.status === 'open' ? (
                  <span className="text-success">Aberta</span>
                ) : (
                  <span className="text-danger">Fechada</span>
                )}
              </strong>
            </p>
          </div>

          {currentSession?.status === 'open' ? (
            <Button
              variant="danger"
              onClick={() => setIsCloseModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Square size={18} />
              Fechar Caixa
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => setIsOpenModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Play size={18} />
              Abrir Caixa
            </Button>
          )}
        </div>
      </Card>

      {/* Current Session Details */}
      {currentSession && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary to-secondary text-white">
            <p className="text-sm opacity-90">Saldo de Abertura</p>
            <p className="text-3xl font-bold mt-2">
              R$ {currentSession.openingBalance?.toFixed(2) || '0.00'}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-success to-primary text-white">
            <p className="text-sm opacity-90">Saldo Atual</p>
            <p className="text-3xl font-bold mt-2">
              R$ {currentSession.currentBalance?.toFixed(2) || '0.00'}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-warning to-accent text-white">
            <p className="text-sm opacity-90">Variação</p>
            <p className="text-3xl font-bold mt-2">
              R${' '}
              {(
                (currentSession.currentBalance || 0) - (currentSession.openingBalance || 0)
              ).toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <h3 className="text-xl font-bold mb-4">Histórico de Transações</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Nenhuma transação registrada ainda</p>
        </div>
      </Card>

      {/* Open Session Modal */}
      <Modal
        isOpen={isOpenModalOpen}
        title="Abrir Caixa"
        onClose={() => setIsOpenModalOpen(false)}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setIsOpenModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleOpenSession}
              className="flex-1"
            >
              Abrir Caixa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenSession} className="space-y-4">
          <Input
            label="Saldo de Abertura (R$)"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            required
          />
          <p className="text-sm text-gray-600">
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
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setIsCloseModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleCloseSession}
              className="flex-1"
            >
              Fechar Caixa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCloseSession} className="space-y-4">
          <div className="p-4 bg-light rounded-lg">
            <p className="text-sm text-gray-600">Saldo Atual do Caixa</p>
            <p className="text-2xl font-bold">
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
          <p className="text-sm text-gray-600">
            Informe o valor total em dinheiro que está no caixa neste momento.
          </p>
        </form>
      </Modal>
    </div>
  );
};
