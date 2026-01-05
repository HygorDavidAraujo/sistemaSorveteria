import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Modal, Loading, Alert, Badge } from '@/components/common';
import { Gift, Search, TrendingUp } from 'lucide-react';
import type { Customer, LoyaltyTransaction } from '@/types';
import './LoyaltyPage.css';

export const LoyaltyPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomers();
      const customersList = response.data || response;
      setCustomers(customersList.filter((c: any) => c.loyaltyPoints > 0));
    } catch (err) {
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const response = await apiClient.getLoyaltyTransactions(customer.id);
      setTransactions(response.data || response);
    } catch (err) {
      setError('Erro ao carregar transações');
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const points = parseInt(redeemAmount);
      if (points > selectedCustomer.loyaltyPoints) {
        setError('Pontos insuficientes');
        return;
      }

      await apiClient.redeemLoyaltyPoints(selectedCustomer.id, points);
      setSuccess('Pontos resgatados com sucesso!');
      setIsRedeemModalOpen(false);
      setRedeemAmount('');
      
      // Reload customer data
      const response = await apiClient.getCustomer(selectedCustomer.id);
      setSelectedCustomer(response.data || response);
      loadCustomers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao resgatar pontos');
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loading message="Carregando dados de lealdade..." />;

  return (
    <div className="loyalty-page">
      <div className="page-header">
        <Gift size={32} />
        <h1>Sistema de Lealdade</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="loyalty-page__grid">
        {/* Customers List */}
        <div className="loyalty-page__sidebar">
          <Card className="loyalty-page__customers-card">
            <h2 className="loyalty-page__section-title">Clientes com Pontos</h2>

            <Input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="loyalty-page__search-input"
            />

            <div className="loyalty-page__customers-list">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`loyalty-page__customer-item ${
                    selectedCustomer?.id === customer.id
                      ? 'loyalty-page__customer-item--active'
                      : ''
                  }`}
                >
                  <p className="loyalty-page__customer-name">{customer.name}</p>
                  <p className="loyalty-page__customer-email">{customer.email}</p>
                  <p className="loyalty-page__customer-points">
                    {customer.loyaltyPoints} pontos
                  </p>
                </button>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="loyalty-page__empty-state">
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </Card>
        </div>

        {/* Customer Details */}
        {selectedCustomer ? (
          <div className="loyalty-page__details">
            {/* Customer Info */}
            <Card className="loyalty-page__customer-header">
              <div className="loyalty-page__customer-info">
                <div>
                  <h2 className="loyalty-page__customer-title">{selectedCustomer.name}</h2>
                  <p className="loyalty-page__customer-subtitle">{selectedCustomer.email}</p>
                </div>
                <Badge variant="success" className="loyalty-page__badge">
                  {selectedCustomer.loyaltyPoints} pts
                </Badge>
              </div>
            </Card>

            {/* Points Info */}
            <div className="loyalty-page__points-grid">
              <Card>
                <p className="loyalty-page__card-label">
                  <TrendingUp size={16} />
                  Pontos Disponíveis
                </p>
                <p className="loyalty-page__card-value loyalty-page__card-value--primary">
                  {selectedCustomer.loyaltyPoints}
                </p>
              </Card>

              <Card>
                <p className="loyalty-page__card-label">Valor em Reais</p>
                <p className="loyalty-page__card-value loyalty-page__card-value--secondary">
                  R$ {(selectedCustomer.loyaltyPoints * 0.1).toFixed(2)}
                </p>
                <p className="loyalty-page__card-note">(1 ponto = R$ 0,10)</p>
              </Card>
            </div>

            {/* Redeem Button */}
            <Button
              variant="success"
              onClick={() => setIsRedeemModalOpen(true)}
              className="loyalty-page__redeem-button"
            >
              Resgatar Pontos
            </Button>

            {/* Transactions */}
            <Card>
              <h3 className="loyalty-page__transactions-title">Histórico de Transações</h3>
              <div className="loyalty-page__transactions-list">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="loyalty-page__transaction-item"
                    >
                      <div>
                        <p className="loyalty-page__transaction-desc">{tx.description}</p>
                        <p className="loyalty-page__transaction-date">
                          {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge
                        variant={tx.type === 'earn' ? 'success' : 'danger'}
                      >
                        {tx.type === 'earn' ? '+' : '-'}{tx.points}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="loyalty-page__empty-text">Nenhuma transação</p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="loyalty-page__details">
            <Card className="loyalty-page__placeholder">
              <Search size={48} className="loyalty-page__placeholder-icon" />
              <p className="loyalty-page__placeholder-text">
                Selecione um cliente para ver os detalhes de lealdade
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={isRedeemModalOpen}
          title="Resgatar Pontos"
          onClose={() => setIsRedeemModalOpen(false)}
          footer={
            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={() => setIsRedeemModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleRedeem}
                className="flex-1"
              >
                Resgatar
              </Button>
            </div>
          }
        >
          <form onSubmit={handleRedeem} className="loyalty-page__redeem-form">
            <div className="loyalty-page__redeem-balance">
              <p className="loyalty-page__redeem-label">Pontos Disponíveis</p>
              <p className="loyalty-page__redeem-value loyalty-page__redeem-value--primary">
                {selectedCustomer.loyaltyPoints}
              </p>
            </div>

            <Input
              label="Quantidade de Pontos a Resgatar"
              type="number"
              step="1"
              min="1"
              max={selectedCustomer.loyaltyPoints}
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              required
            />

            {redeemAmount && (
              <div className="loyalty-page__redeem-discount">
                <p className="loyalty-page__redeem-label">Valor de Desconto</p>
                <p className="loyalty-page__redeem-value loyalty-page__redeem-value--success">
                  R$ {(parseInt(redeemAmount) * 0.1).toFixed(2)}
                </p>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
