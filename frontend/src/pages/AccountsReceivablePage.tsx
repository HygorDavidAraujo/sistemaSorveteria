import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { Alert, Badge, Button, Card, Input, Loading, Modal, Select } from '@/components/common';
import type { AccountReceivable, Customer, PaymentMethod } from '@/types';
import './AccountsReceivablePage.css';

const STATUS_LABEL: Record<AccountReceivable['status'], string> = {
  pending: 'Pendente',
  paid: 'Recebido',
  cancelled: 'Cancelado',
  overdue: 'Vencido',
};

const STATUS_VARIANT: Record<AccountReceivable['status'], any> = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'danger',
  overdue: 'danger',
};

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'debit_card', label: 'Cartão Débito' },
  { value: 'credit_card', label: 'Cartão Crédito' },
  { value: 'pix', label: 'PIX' },
  { value: 'other', label: 'Outros' },
];

const formatMoney = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '-');
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const AccountsReceivablePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    customerId: '',
    status: '',
    startDueDate: '',
    endDueDate: '',
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: '',
    customerName: '',
    description: '',
    amount: '',
    dueDate: todayISO(),
    notes: '',
  });

  const [receiveTarget, setReceiveTarget] = useState<AccountReceivable | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    paymentDate: todayISO(),
    paymentMethod: 'pix' as PaymentMethod,
    notes: '',
  });

  const loadCustomers = async () => {
    const response = await apiClient.getCustomers();
    const list = response.data || response;
    setCustomers(list);
  };

  const loadAccounts = async () => {
    const response = await apiClient.searchAccountsReceivable({
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.startDueDate ? { startDueDate: filters.startDueDate } : {}),
      ...(filters.endDueDate ? { endDueDate: filters.endDueDate } : {}),
      page: 1,
      limit: 50,
    });

    const list = response.data || response;
    setAccounts(list);
  };

  const load = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCustomers(), loadAccounts()]);
    } catch {
      setError('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    if (!id) return;

    const openFromQuery = async () => {
      try {
        let acc: any = accounts.find((a) => a.id === id) || null;

        if (!acc) {
          const response = await apiClient.get(`/financial/accounts-receivable/${id}`);
          acc = response.data || response;
        }

        if (acc?.id) {
          setHighlightId(acc.id);
          setTimeout(() => setHighlightId(null), 4000);

          if (action === 'receive' && acc.status !== 'paid' && acc.status !== 'cancelled') {
            openReceive(acc);
          }
        }
      } catch {
        // ignore
      }
    };

    openFromQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, searchParams]);

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({ value: c.id, label: c.name }));
  }, [customers]);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const openCreate = () => {
    setError(null);
    setSuccess(null);
    setCreateForm({
      customerId: '',
      customerName: '',
      description: '',
      amount: '',
      dueDate: todayISO(),
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const onCustomerChange = (customerId: string) => {
    const name = customerNameById.get(customerId) || '';
    setCreateForm((p) => ({ ...p, customerId, customerName: name }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await apiClient.createAccountReceivable({
        ...(createForm.customerId ? { customerId: createForm.customerId } : {}),
        customerName: createForm.customerName,
        description: createForm.description,
        amount: Number(createForm.amount),
        dueDate: createForm.dueDate,
        notes: createForm.notes || undefined,
      });

      setIsCreateOpen(false);
      setSuccess('Conta a receber criada com sucesso');
      setTimeout(() => setSuccess(null), 2500);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar conta a receber');
    }
  };

  const openReceive = (acc: AccountReceivable) => {
    setReceiveTarget(acc);
    setReceiveForm({ paymentDate: todayISO(), paymentMethod: 'pix', notes: '' });
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveTarget) return;

    setError(null);
    try {
      await apiClient.receiveAccountReceivable(receiveTarget.id, {
        paymentDate: receiveForm.paymentDate,
        paymentMethod: receiveForm.paymentMethod,
        notes: receiveForm.notes || undefined,
      });
      setReceiveTarget(null);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar recebimento');
    }
  };

  const handleCancel = async (acc: AccountReceivable) => {
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;

    setError(null);
    try {
      await apiClient.cancelAccountReceivable(acc.id, reason);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar');
    }
  };

  return (
    <div className="accounts-receivable-page">
      <div className="accounts-receivable-header">
        <div className="page-header">
          <FilePlus size={28} />
          <h1>Contas a Receber</h1>
        </div>
        <div className="accounts-receivable-header-actions">
          <Button variant="secondary" onClick={() => loadAccounts()}>
            Buscar
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nova
          </Button>
        </div>
      </div>

      <Card className="accounts-receivable-filters">
        <div className="accounts-receivable-filters-grid">
          <Select
            label="Cliente"
            value={filters.customerId}
            onChange={(e) => setFilters((p) => ({ ...p, customerId: e.target.value }))}
            options={[{ value: '', label: 'Todos' }, ...customerOptions]}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            options={[
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendente' },
              { value: 'paid', label: 'Recebido' },
              { value: 'overdue', label: 'Vencido' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
          />
          <Input
            label="Vencimento (de)"
            type="date"
            value={filters.startDueDate}
            onChange={(e) => setFilters((p) => ({ ...p, startDueDate: e.target.value }))}
          />
          <Input
            label="Vencimento (até)"
            type="date"
            value={filters.endDueDate}
            onChange={(e) => setFilters((p) => ({ ...p, endDueDate: e.target.value }))}
          />
        </div>
      </Card>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Loading message="Carregando contas a receber..." />
      ) : (
        <div className="accounts-receivable-table-wrapper">
          <table className="accounts-receivable-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th className="accounts-receivable-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className={highlightId === acc.id ? 'accounts-receivable-row-highlight' : ''}>
                  <td className="accounts-receivable-name">{acc.customerName}</td>
                  <td>{acc.description}</td>
                  <td className="accounts-receivable-muted">{String(acc.dueDate).slice(0, 10)}</td>
                  <td className="accounts-receivable-money">{formatMoney(acc.amount)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[acc.status]}>{STATUS_LABEL[acc.status]}</Badge>
                  </td>
                  <td className="accounts-receivable-right">
                    <div className="accounts-receivable-actions">
                      {acc.status !== 'paid' && acc.status !== 'cancelled' && (
                        <Button size="sm" variant="success" onClick={() => openReceive(acc)}>
                          Receber
                        </Button>
                      )}
                      {acc.status !== 'cancelled' && acc.status !== 'paid' && (
                        <Button size="sm" variant="danger" onClick={() => handleCancel(acc)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        title="Nova conta a receber"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <div className="accounts-receivable-modal-footer">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate as any}>Salvar</Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="accounts-receivable-form">
          <Select
            label="Cliente"
            value={createForm.customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            options={customerOptions}
          />
          <Input
            label="Nome do cliente"
            value={createForm.customerName}
            onChange={(e) => setCreateForm((p) => ({ ...p, customerName: e.target.value }))}
            required
          />
          <Input
            label="Descrição"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <Input
            label="Valor"
            type="number"
            step="0.01"
            min={0}
            value={createForm.amount}
            onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
            required
          />
          <Input
            label="Vencimento"
            type="date"
            value={createForm.dueDate}
            onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
            required
          />
          <Input
            label="Observações (opcional)"
            value={createForm.notes}
            onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        isOpen={!!receiveTarget}
        title={receiveTarget ? `Recebimento - ${receiveTarget.description}` : 'Recebimento'}
        onClose={() => setReceiveTarget(null)}
        footer={
          <div className="accounts-receivable-modal-footer">
            <Button variant="secondary" onClick={() => setReceiveTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive as any}>Registrar</Button>
          </div>
        }
      >
        <form onSubmit={handleReceive} className="accounts-receivable-form">
          <Input
            label="Data do recebimento"
            type="date"
            value={receiveForm.paymentDate}
            onChange={(e) => setReceiveForm((p) => ({ ...p, paymentDate: e.target.value }))}
            required
          />
          <Select
            label="Forma de pagamento"
            value={receiveForm.paymentMethod}
            onChange={(e) => setReceiveForm((p) => ({ ...p, paymentMethod: e.target.value as any }))}
            options={PAYMENT_METHOD_OPTIONS}
          />
          <Input
            label="Observações (opcional)"
            value={receiveForm.notes}
            onChange={(e) => setReceiveForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
};
