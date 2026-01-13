import React, { useEffect, useMemo, useState } from 'react';
import { FileMinus, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { Alert, Badge, Button, Card, Input, Loading, Modal, Select } from '@/components/common';
import type { AccountPayable, FinancialCategory } from '@/types';
import './AccountsPayablePage.css';

const STATUS_LABEL: Record<AccountPayable['status'], string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
  overdue: 'Vencido',
};

const STATUS_VARIANT: Record<AccountPayable['status'], any> = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'danger',
  overdue: 'danger',
};

const formatMoney = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '-');
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const AccountsPayablePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    supplierName: '',
    status: '',
    startDueDate: '',
    endDueDate: '',
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    supplierName: '',
    description: '',
    amount: '',
    dueDate: todayISO(),
    categoryId: '',
    notes: '',
  });

  const [paymentTarget, setPaymentTarget] = useState<AccountPayable | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: todayISO(),
    notes: '',
  });

  const [detailsTarget, setDetailsTarget] = useState<AccountPayable | null>(null);

  const [editTarget, setEditTarget] = useState<AccountPayable | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    dueDate: todayISO(),
    paymentMethod: '',
    notes: '',
  });

  const loadCategories = async () => {
    const response = await apiClient.getFinancialCategories(true);
    const list = response.data || response;
    setCategories(list);
  };

  const loadAccounts = async () => {
    const response = await apiClient.searchAccountsPayable({
      ...(filters.supplierName ? { supplierName: filters.supplierName } : {}),
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
      await Promise.all([loadCategories(), loadAccounts()]);
    } catch {
      setError('Erro ao carregar contas a pagar');
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
    if (!id) return;

    const openFromQuery = async () => {
      try {
        const local = accounts.find((a) => a.id === id);
        if (local) {
          setDetailsTarget(local);
          setHighlightId(local.id);
          setTimeout(() => setHighlightId(null), 4000);
          return;
        }

        const response = await apiClient.get(`/financial/accounts-payable/${id}`);
        const acc = response.data || response;
        if (acc?.id) {
          setDetailsTarget(acc);
          setHighlightId(acc.id);
          setTimeout(() => setHighlightId(null), 4000);
        }
      } catch {
        // ignore: if not found or unauthorized
      }
    };

    openFromQuery();
  }, [accounts, searchParams]);

  const categoryOptions = useMemo(() => {
    return categories
      .filter((c) => c.categoryType !== 'revenue')
      .map((c) => ({ value: c.id, label: c.name }));
  }, [categories]);

  const openCreate = () => {
    setError(null);
    setSuccess(null);

    if (categoryOptions.length === 0) {
      setError('Nenhuma categoria disponível. Aguarde carregar ou cadastre categorias financeiras.');
      return;
    }

    setCreateForm({
      supplierName: '',
      description: '',
      amount: '',
      dueDate: todayISO(),
      categoryId: categoryOptions[0]?.value || '',
      notes: '',
    });
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const supplierName = createForm.supplierName.trim();
    const description = createForm.description.trim();
    const amount = Number(createForm.amount);
    const categoryId = createForm.categoryId;

    if (!supplierName) {
      setError('Informe o fornecedor');
      return;
    }
    if (!description) {
      setError('Informe a descrição');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe um valor válido');
      return;
    }
    if (!categoryId) {
      setError('Selecione uma categoria');
      return;
    }

    try {
      await apiClient.createAccountPayable({
        supplierName,
        description,
        amount,
        dueDate: createForm.dueDate,
        categoryId,
        notes: createForm.notes || undefined,
      });

      setIsCreateOpen(false);
      setSuccess('Conta a pagar criada com sucesso');
      setTimeout(() => setSuccess(null), 2500);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar conta a pagar');
    }
  };

  const openPay = (acc: AccountPayable) => {
    setPaymentTarget(acc);
    setPaymentForm({ paymentDate: todayISO(), notes: '' });
  };

  const openEdit = (acc: AccountPayable) => {
    setError(null);
    setSuccess(null);
    setEditTarget(acc);
    setEditForm({
      description: acc.description ?? '',
      dueDate: String(acc.dueDate).slice(0, 10) || todayISO(),
      paymentMethod: '',
      notes: acc.notes ?? '',
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setError(null);
    setSuccess(null);

    const description = editForm.description.trim();
    if (!description) {
      setError('Informe a descrição');
      return;
    }

    try {
      await apiClient.updateAccountPayable(editTarget.id, {
        description,
        dueDate: editForm.dueDate,
        ...(editForm.paymentMethod ? { paymentMethod: editForm.paymentMethod } : {}),
        notes: editForm.notes || undefined,
      });

      setEditTarget(null);
      setSuccess('Conta atualizada com sucesso');
      setTimeout(() => setSuccess(null), 2500);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao editar conta a pagar');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;

    setError(null);
    try {
      await apiClient.payAccountPayable(paymentTarget.id, {
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes || undefined,
      });
      setPaymentTarget(null);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar pagamento');
    }
  };

  const handleCancel = async (acc: AccountPayable) => {
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;

    setError(null);
    try {
      await apiClient.cancelAccountPayable(acc.id, reason);
      await loadAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar');
    }
  };

  return (
    <div className="accounts-payable-page">
      <div className="accounts-payable-header">
        <div className="page-header">
          <FileMinus size={28} />
          <h1>Contas a Pagar</h1>
        </div>
        <div className="accounts-payable-header-actions">
          <Button variant="secondary" onClick={() => loadAccounts()}>
            Buscar
          </Button>
          <Button onClick={openCreate} disabled={loading || categoryOptions.length === 0}>
            <Plus size={16} />
            Nova
          </Button>
        </div>
      </div>

      <Card className="accounts-payable-filters">
        <div className="accounts-payable-filters-grid">
          <Input
            label="Fornecedor"
            value={filters.supplierName}
            onChange={(e) => setFilters((p) => ({ ...p, supplierName: e.target.value }))}
            placeholder="Ex: Distribuidora XYZ"
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            options={[
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendente' },
              { value: 'paid', label: 'Pago' },
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
        <Loading message="Carregando contas a pagar..." />
      ) : (
        <div className="accounts-payable-table-wrapper">
          <table className="accounts-payable-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th className="accounts-payable-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className={highlightId === acc.id ? 'accounts-payable-row-highlight' : ''}>
                  <td className="accounts-payable-name">{acc.supplierName}</td>
                  <td>{acc.description}</td>
                  <td className="accounts-payable-muted">{String(acc.dueDate).slice(0, 10)}</td>
                  <td className="accounts-payable-money">{formatMoney(acc.amount)}</td>
                  <td>
                    <Badge variant={STATUS_VARIANT[acc.status]}>{STATUS_LABEL[acc.status]}</Badge>
                  </td>
                  <td className="accounts-payable-right">
                    <div className="accounts-payable-actions">
                      <Button size="sm" variant="secondary" onClick={() => setDetailsTarget(acc)}>
                        Detalhes
                      </Button>
                      {acc.status !== 'paid' && acc.status !== 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(acc)}>
                          Editar
                        </Button>
                      )}
                      {acc.status !== 'paid' && acc.status !== 'cancelled' && (
                        <Button size="sm" variant="success" onClick={() => openPay(acc)}>
                          Pagar
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
        title="Nova conta a pagar"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <div className="accounts-payable-modal-footer">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="accounts-payable-create-form">Salvar</Button>
          </div>
        }
      >
        <form id="accounts-payable-create-form" onSubmit={handleCreate} className="accounts-payable-form">
          <Input
            label="Fornecedor"
            value={createForm.supplierName}
            onChange={(e) => setCreateForm((p) => ({ ...p, supplierName: e.target.value }))}
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
          <Select
            label="Categoria"
            value={createForm.categoryId}
            onChange={(e) => setCreateForm((p) => ({ ...p, categoryId: e.target.value }))}
            options={categoryOptions}
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
        isOpen={!!paymentTarget}
        title={paymentTarget ? `Pagamento - ${paymentTarget.description}` : 'Pagamento'}
        onClose={() => setPaymentTarget(null)}
        footer={
          <div className="accounts-payable-modal-footer">
            <Button variant="secondary" onClick={() => setPaymentTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="accounts-payable-payment-form">Registrar</Button>
          </div>
        }
      >
        <form id="accounts-payable-payment-form" onSubmit={handlePay} className="accounts-payable-form">
          <Input
            label="Data do pagamento"
            type="date"
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
            required
          />
          <Input
            label="Observações (opcional)"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        isOpen={!!detailsTarget}
        title={detailsTarget ? `Detalhes - ${detailsTarget.description}` : 'Detalhes'}
        onClose={() => setDetailsTarget(null)}
        footer={
          <div className="accounts-payable-modal-footer">
            <Button variant="secondary" onClick={() => setDetailsTarget(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        {detailsTarget && (
          <div className="accounts-payable-details">
            <div><strong>Fornecedor:</strong> {detailsTarget.supplierName}</div>
            <div><strong>Descrição:</strong> {detailsTarget.description}</div>
            <div><strong>Categoria:</strong> {detailsTarget.category?.name || '-'}</div>
            <div><strong>Vencimento:</strong> {String(detailsTarget.dueDate).slice(0, 10)}</div>
            <div><strong>Valor:</strong> {formatMoney(detailsTarget.amount)}</div>
            <div><strong>Status:</strong> {STATUS_LABEL[detailsTarget.status]}</div>
            <div><strong>Pago em:</strong> {detailsTarget.paidAt ? String(detailsTarget.paidAt).slice(0, 10) : '-'}</div>
            <div><strong>Observações:</strong> {detailsTarget.notes || '-'}</div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editTarget}
        title={editTarget ? `Editar - ${editTarget.description}` : 'Editar'}
        onClose={() => setEditTarget(null)}
        footer={
          <div className="accounts-payable-modal-footer">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="accounts-payable-edit-form">Salvar</Button>
          </div>
        }
      >
        <form id="accounts-payable-edit-form" onSubmit={handleEdit} className="accounts-payable-form">
          <Input
            label="Descrição"
            value={editForm.description}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <Input
            label="Vencimento"
            type="date"
            value={editForm.dueDate}
            onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))}
            required
          />
          <Select
            label="Forma de pagamento (opcional)"
            value={editForm.paymentMethod}
            onChange={(e) => setEditForm((p) => ({ ...p, paymentMethod: e.target.value }))}
            options={[
              { value: '', label: 'Não informar' },
              { value: 'cash', label: 'Dinheiro' },
              { value: 'debit_card', label: 'Débito' },
              { value: 'credit_card', label: 'Crédito' },
              { value: 'pix', label: 'Pix' },
              { value: 'other', label: 'Outro' },
            ]}
          />
          <Input
            label="Observações (opcional)"
            value={editForm.notes}
            onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
};
