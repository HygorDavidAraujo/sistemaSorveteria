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
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 text-dark">
        <Gift size={32} />
        <h1 className="text-3xl font-bold leading-tight">Sistema de Lealdade</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Customers List */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-24 space-y-4">
            <h2 className="text-xl font-semibold leading-tight">Clientes com Pontos</h2>

            <Input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full text-left p-3 rounded-lg transition border-2 ${
                    selectedCustomer?.id === customer.id
                      ? 'border-primary bg-primary bg-opacity-10'
                      : 'border-light hover:border-primary'
                  }`}
                >
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                  <p className="text-sm font-bold text-primary mt-1">
                    {customer.loyaltyPoints} pontos
                  </p>
                </button>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </Card>
        </div>

        {/* Customer Details */}
        {selectedCustomer ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card className="bg-gradient-to-r from-primary to-secondary text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                  <p className="text-sm opacity-90 mt-2">{selectedCustomer.email}</p>
                </div>
                <Badge variant="success" className="text-white">
                  {selectedCustomer.loyaltyPoints} pts
                </Badge>
              </div>
            </Card>

            {/* Points Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Pontos Disponíveis
                </p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {selectedCustomer.loyaltyPoints}
                </p>
              </Card>

              <Card>
                <p className="text-sm text-gray-600">Valor em Reais</p>
                <p className="text-3xl font-bold text-secondary mt-2">
                  R$ {(selectedCustomer.loyaltyPoints * 0.1).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">(1 ponto = R$ 0,10)</p>
              </Card>
            </div>

            {/* Redeem Button */}
            <Button
              variant="success"
              onClick={() => setIsRedeemModalOpen(true)}
              className="w-full"
            >
              Resgatar Pontos
            </Button>

            {/* Transactions */}
            <Card>
              <h3 className="text-xl font-bold mb-4">Histórico de Transações</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex justify-between items-center p-3 bg-light rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-gray-500">
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
                  <p className="text-gray-500 text-center py-4">Nenhuma transação</p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2">
            <Card className="text-center py-12">
              <Search size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
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
          <form onSubmit={handleRedeem} className="space-y-4">
            <div className="p-4 bg-light rounded-lg">
              <p className="text-sm text-gray-600">Pontos Disponíveis</p>
              <p className="text-2xl font-bold text-primary">
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
              <div className="p-4 bg-success bg-opacity-10 rounded-lg">
                <p className="text-sm text-gray-600">Valor de Desconto</p>
                <p className="text-2xl font-bold text-success">
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
