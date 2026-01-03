import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Modal, Loading, Alert, Badge } from '@/components/common';
import { Users, Plus, Eye, Gift } from 'lucide-react';
import type { Customer } from '@/types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createCustomer(form);
      setSuccess('Cliente criado com sucesso!');
      loadCustomers();
      setIsFormModalOpen(false);
      setForm({ name: '', email: '', phone: '', cpf: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar cliente');
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.includes(searchTerm)
  );

  if (loading) return <Loading message="Carregando clientes..." />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark flex items-center gap-2">
          <Users size={32} />
          Gerenciar Clientes
        </h1>
        <Button
          variant="primary"
          onClick={() => {
            setForm({ name: '', email: '', phone: '', cpf: '' });
            setIsFormModalOpen(true);
          }}
        >
          <Plus size={18} className="mr-2 inline" />
          Novo Cliente
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card className="mb-6">
        <Input
          label="Buscar Clientes"
          type="text"
          placeholder="Nome, email ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-light">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Nome</th>
              <th className="px-6 py-3 text-left font-semibold">Email</th>
              <th className="px-6 py-3 text-left font-semibold">Telefone</th>
              <th className="px-6 py-3 text-left font-semibold">CPF</th>
              <th className="px-6 py-3 text-center font-semibold">Pontos</th>
              <th className="px-6 py-3 text-center font-semibold">Cashback</th>
              <th className="px-6 py-3 text-left font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-light transition">
                <td className="px-6 py-4 font-semibold">{customer.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                <td className="px-6 py-4 text-sm">{customer.phone || '-'}</td>
                <td className="px-6 py-4 text-sm">{customer.cpf || '-'}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="secondary">{customer.loyaltyPoints} pts</Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="success">R$ {customer.cashbackBalance.toFixed(2)}</Badge>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleViewDetails(customer)}
                    className="text-primary hover:text-secondary mr-4"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
        </Card>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        title="Novo Cliente"
        onClose={() => setIsFormModalOpen(false)}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="flex-1"
            >
              Criar Cliente
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            placeholder="000.000.000-00"
          />
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={isDetailModalOpen}
          title={`Detalhes - ${selectedCustomer.name}`}
          onClose={() => setIsDetailModalOpen(false)}
          footer={
            <Button
              variant="secondary"
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full"
            >
              Fechar
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="bg-light p-4 rounded-lg">
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold">{selectedCustomer.email}</p>
            </div>

            <div className="bg-light p-4 rounded-lg">
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-semibold">{selectedCustomer.phone || 'Não informado'}</p>
            </div>

            <div className="bg-light p-4 rounded-lg">
              <p className="text-sm text-gray-600">CPF</p>
              <p className="font-semibold">{selectedCustomer.cpf || 'Não informado'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-secondary to-accent text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Gift size={20} />
                  <p className="text-sm opacity-90">Pontos de Lealdade</p>
                </div>
                <p className="text-2xl font-bold">{selectedCustomer.loyaltyPoints}</p>
              </Card>

              <Card className="bg-gradient-to-br from-success to-primary text-white">
                <p className="text-sm opacity-90">Cashback Disponível</p>
                <p className="text-2xl font-bold">R$ {selectedCustomer.cashbackBalance.toFixed(2)}</p>
              </Card>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
