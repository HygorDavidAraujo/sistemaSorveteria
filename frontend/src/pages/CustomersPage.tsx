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
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    birthDate: '',
    gender: '',
    customerType: 'pf',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    referencePoint: '',
    acceptsMarketing: true,
    preferredContactMethod: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomers();
      const customers = response.data || response;
      setCustomers(customers);
    } catch (err) {
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const sanitizePayload = (data: typeof form) => {
    // Remove campos vazios para evitar 422 em campos que não aceitam string vazia no backend
    return Object.entries(data).reduce((acc: any, [key, value]) => {
      if (value === '' || value === undefined) {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {} as Partial<typeof form>);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = sanitizePayload(form);
    try {
      await apiClient.createCustomer(payload);
      setSuccess('Cliente criado com sucesso!');
      loadCustomers();
      setIsFormModalOpen(false);
      setForm({ 
        name: '', email: '', phone: '', whatsapp: '', cpf: '', birthDate: '', gender: '',
        customerType: 'pf', acceptsMarketing: true, preferredContactMethod: '',
        street: '', number: '', complement: '', neighborhood: '', city: '', state: '', 
        zipCode: '', referencePoint: '' 
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar cliente');
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditingDetail(false);
    setIsDetailModalOpen(true);
  };

  const handleEditDetail = () => {
    if (selectedCustomer) {
      setForm({
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone || '',
        whatsapp: selectedCustomer.whatsapp || '',
        cpf: selectedCustomer.cpf || '',
        birthDate: selectedCustomer.birthDate || '',
        gender: selectedCustomer.gender || '',
        customerType: selectedCustomer.customerType || 'pf',
        street: selectedCustomer.street || '',
        number: selectedCustomer.number || '',
        complement: selectedCustomer.complement || '',
        neighborhood: selectedCustomer.neighborhood || '',
        city: selectedCustomer.city || '',
        state: selectedCustomer.state || '',
        zipCode: selectedCustomer.zipCode || '',
        referencePoint: selectedCustomer.referencePoint || '',
        acceptsMarketing: selectedCustomer.acceptsMarketing !== false,
        preferredContactMethod: selectedCustomer.preferredContactMethod || '',
      });
      setIsEditingDetail(true);
    }
  };

  const handleSaveEditDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const payload = sanitizePayload(form);

    try {
      await apiClient.updateCustomer(selectedCustomer.id, payload);
      setSuccess('Cliente atualizado com sucesso!');
      loadCustomers();
      setIsDetailModalOpen(false);
      setIsEditingDetail(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar cliente');
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.includes(searchTerm) ||
    c.phone?.includes(searchTerm) ||
    c.whatsapp?.includes(searchTerm)
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
            setForm({ 
              name: '', email: '', phone: '', whatsapp: '', cpf: '', birthDate: '', gender: '',
              customerType: 'pf', acceptsMarketing: true, preferredContactMethod: '',
              street: '', number: '', complement: '', neighborhood: '', city: '', state: '', 
              zipCode: '', referencePoint: '' 
            });
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
          className="customers-form-input"
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
                  <Badge variant="success">R$ {parseFloat(String(customer.cashbackBalance || 0)).toFixed(2)}</Badge>
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
          <div className="customers-form-section">
            <h3 className="customers-form-section-title">Dados Pessoais</h3>
            <div className="customers-form-grid">
              <Input
                className="customers-form-input"
                label="Nome"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                className="customers-form-input"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                className="customers-form-input"
                label="Data de Nascimento"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
              <div className="customers-form-group">
                <label className="customers-form-label">Gênero</label>
                <select
                  className="customers-form-select"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Selecionar Gênero</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
                <option value="not_specified">Não especificar</option>
              </select>
              </div>
              <Input
                className="customers-form-input"
                label="Telefone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="CPF"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
              <div className="customers-form-group">
                <label className="customers-form-label">Tipo de Cliente</label>
                <select
                  className="customers-form-select"
                  value={form.customerType}
                  onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                >
                  <option value="pf">Pessoa Física</option>
                  <option value="pj">Pessoa Jurídica</option>
                </select>
              </div>
            </div>
          </div>

          <div className="customers-form-section">
            <h3 className="customers-form-section-title">Endereço</h3>
            <div className="customers-form-grid">
              <Input
                className="customers-form-input"
                label="CEP"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                placeholder="00000-000"
              />
              <Input
                className="customers-form-input"
                label="Rua"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="Número"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="Complemento"
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                placeholder="Apto, Bloco, etc"
              />
              <Input
                className="customers-form-input"
                label="Bairro"
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="Cidade"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                className="customers-form-input"
                label="Estado"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
              />
              <Input
                className="customers-form-input"
                label="Ponto de Referência"
                value={form.referencePoint}
                onChange={(e) => setForm({ ...form, referencePoint: e.target.value })}
                placeholder="Próximo a..."
              />
            </div>
          </div>

          <div className="customers-form-section">
            <h3 className="customers-form-section-title">Preferências</h3>
            <div className="customers-form-grid">
              <div className="customers-form-group">
                <label className="customers-form-label">Método de Contato Preferido</label>
                <select
                  className="customers-form-select"
                  value={form.preferredContactMethod}
                  onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="phone">Telefone</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <label className="customers-form-checkbox">
                <input
                  type="checkbox"
                  checked={form.acceptsMarketing}
                  onChange={(e) => setForm({ ...form, acceptsMarketing: e.target.checked })}
                />
                <span>Aceita receber promoções e newsletter</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={isDetailModalOpen}
          title={`${isEditingDetail ? 'Editar' : 'Detalhes'} - ${selectedCustomer.name}`}
          onClose={() => {
            setIsDetailModalOpen(false);
            setIsEditingDetail(false);
          }}
          footer={
            isEditingDetail ? (
              <div className="customers-modal-footer">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingDetail(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEditDetail}
                >
                  Salvar Alterações
                </Button>
              </div>
            ) : (
              <div className="customers-modal-footer">
                <Button
                  variant="primary"
                  onClick={handleEditDetail}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            )
          }
        >
          {isEditingDetail ? (
            <form onSubmit={handleSaveEditDetail} className="customers-form">
              <div className="customers-form-section">
                <h3 className="customers-form-section-title">Dados Pessoais</h3>
                <div className="customers-form-grid">
                  <Input
                    className="customers-form-input"
                    label="Nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                  <Input
                    className="customers-form-input"
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                  <Input
                    className="customers-form-input"
                    label="Telefone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="WhatsApp"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="CPF"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                  <Input
                    className="customers-form-input"
                    label="Data de Nascimento"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="customers-form-section">
                <h3 className="customers-form-section-title">Endereço</h3>
                <div className="customers-form-grid">
                  <Input
                    className="customers-form-input"
                    label="Rua"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="Número"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="Complemento"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    placeholder="Apto, Bloco, etc"
                  />
                  <Input
                    className="customers-form-input"
                    label="Bairro"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="Cidade"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  <Input
                    className="customers-form-input"
                    label="Estado"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="customers-form-section">
                <h3 className="customers-form-section-title">Preferências</h3>
                <div className="customers-form-grid">
                  <div className="customers-form-group">
                    <label className="customers-form-label">Método de Contato Preferido</label>
                    <select
                      className="customers-form-select"
                      value={form.preferredContactMethod}
                      onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })}
                    >
                      <option value="">Selecione</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <label className="customers-form-checkbox">
                    <input
                      type="checkbox"
                      checked={form.acceptsMarketing}
                      onChange={(e) => setForm({ ...form, acceptsMarketing: e.target.checked })}
                    />
                    <span>Aceita receber promoções e newsletter</span>
                  </label>
                </div>
              </div>
            </form>
          ) : (
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
                    <p className="customers-detail-card-value">R$ {parseFloat(String(selectedCustomer.cashbackBalance || 0)).toFixed(2)}</p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
