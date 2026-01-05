import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Modal, Loading, Alert, Badge } from '@/components/common';
import { Users, Plus, Eye, Gift } from 'lucide-react';
import type { Customer } from '@/types';
import './CustomersPage.css';

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
      const response = await apiClient.getCustomers();
      setCustomers(response.data || response);
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
    <div className="customers-page">
      <div className="customers-header">
        <div className="page-header">
          <Users size={32} />
          <h1>Gerenciar Clientes</h1>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setForm({ name: '', email: '', phone: '', cpf: '' });
            setIsFormModalOpen(true);
          }}
        >
          <Plus size={18} />
          Novo Cliente
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card>
        <Input
          label="Buscar Clientes"
          type="text"
          placeholder="Nome, email ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>CPF</th>
              <th>Pontos</th>
              <th>Cashback</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td className="customers-name">{customer.name}</td>
                <td className="customers-email">{customer.email}</td>
                <td>{customer.phone || '-'}</td>
                <td>{customer.cpf || '-'}</td>
                <td className="customers-center">
                  <Badge variant="secondary">{customer.loyaltyPoints || 0} pts</Badge>
                </td>
                <td className="customers-center">
                  <Badge variant="success">R$ {(customer.cashbackBalance || 0).toFixed(2)}</Badge>
                </td>
                <td>
                  <button
                    onClick={() => handleViewDetails(customer)}
                    className="customers-action-button"
                    title="Ver detalhes do cliente"
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
        <Card>
          <div className="customers-empty">
            <p>Nenhum cliente encontrado</p>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        title="Novo Cliente"
        onClose={() => setIsFormModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
            >
              Criar Cliente
            </Button>
          </div>
        }
      >
        <form className="customers-form">
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
            >
              Fechar
            </Button>
          }
        >
          <div className="customers-details">
            <div className="customers-detail-item">
              <p className="customers-detail-label">Email</p>
              <p className="customers-detail-value">{selectedCustomer.email}</p>
            </div>

            <div className="customers-detail-item">
              <p className="customers-detail-label">Telefone</p>
              <p className="customers-detail-value">{selectedCustomer.phone || 'Não informado'}</p>
            </div>

            <div className="customers-detail-item">
              <p className="customers-detail-label">CPF</p>
              <p className="customers-detail-value">{selectedCustomer.cpf || 'Não informado'}</p>
            </div>

            <div className="customers-detail-cards">
              <Card>
                <div className="customers-detail-card customers-detail-card-loyalty">
                  <div className="customers-detail-card-header">
                    <Gift size={20} />
                    <p>Pontos de Lealdade</p>
                  </div>
                  <p className="customers-detail-card-value">{selectedCustomer.loyaltyPoints || 0}</p>
                </div>
              </Card>

              <Card>
                <div className="customers-detail-card customers-detail-card-cashback">
                  <p className="customers-detail-card-label">Cashback Disponível</p>
                  <p className="customers-detail-card-value">R$ {(selectedCustomer.cashbackBalance || 0).toFixed(2)}</p>
                </div>
              </Card>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
