import React, { useEffect, useMemo, useState } from 'react';
import { FolderTree, Plus, Save } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Alert, Badge, Button, Card, Input, Loading, Modal, Select } from '@/components/common';
import type { FinancialCategory } from '@/types';
import './FinancialCategoriesPage.css';

const CATEGORY_TYPE_LABEL: Record<FinancialCategory['categoryType'], string> = {
  revenue: 'Receita',
  cost: 'Custo',
  expense: 'Despesa',
};

export const FinancialCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [form, setForm] = useState({
    name: '',
    categoryType: 'expense' as FinancialCategory['categoryType'],
    dreGroup: '',
    isActive: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getFinancialCategories();
      const list = response.data || response;
      setCategories(list);
    } catch {
      setError('Erro ao carregar categorias financeiras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', categoryType: 'expense', dreGroup: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (cat: FinancialCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      categoryType: cat.categoryType,
      dreGroup: (cat.dreGroup as any) || '',
      isActive: cat.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        name: form.name,
        categoryType: form.categoryType,
        isActive: form.isActive,
      };
      if (form.dreGroup.trim()) payload.dreGroup = form.dreGroup.trim();

      if (editing) {
        await apiClient.updateFinancialCategory(editing.id, payload);
        setSuccess('Categoria atualizada com sucesso');
      } else {
        await apiClient.createFinancialCategory(payload);
        setSuccess('Categoria criada com sucesso');
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 2500);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar categoria');
    }
  };

  return (
    <div className="financial-categories-page">
      <div className="financial-categories-header">
        <div className="page-header">
          <FolderTree size={28} />
          <h1>Categorias Financeiras</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nova categoria
        </Button>
      </div>

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
        <Loading message="Carregando categorias..." />
      ) : (
        <Card className="financial-categories-card">
          <div className="financial-categories-table-wrapper">
            <table className="financial-categories-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Grupo DRE</th>
                  <th>Status</th>
                  <th className="financial-categories-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((cat) => (
                  <tr key={cat.id}>
                    <td className="financial-categories-name">{cat.name}</td>
                    <td>
                      <Badge variant={cat.categoryType === 'revenue' ? 'success' : cat.categoryType === 'cost' ? 'warning' : 'secondary'}>
                        {CATEGORY_TYPE_LABEL[cat.categoryType]}
                      </Badge>
                    </td>
                    <td className="financial-categories-muted">{cat.dreGroup || '-'}</td>
                    <td>
                      <Badge variant={cat.isActive ? 'success' : 'secondary'}>
                        {cat.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </td>
                    <td className="financial-categories-right">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(cat)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="financial-categories-modal-footer">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave as any}>
              <Save size={16} />
              Salvar
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="financial-categories-form">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Select
            label="Tipo"
            value={form.categoryType}
            onChange={(e) => setForm((p) => ({ ...p, categoryType: e.target.value as any }))}
            options={[
              { value: 'revenue', label: 'Receita' },
              { value: 'cost', label: 'Custo' },
              { value: 'expense', label: 'Despesa' },
            ]}
          />
          <Input
            label="Grupo DRE (opcional)"
            value={form.dreGroup}
            onChange={(e) => setForm((p) => ({ ...p, dreGroup: e.target.value }))}
            placeholder="Ex: operating_expenses"
          />
          <Select
            label="Status"
            value={form.isActive ? 'true' : 'false'}
            onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}
            options={[
              { value: 'true', label: 'Ativa' },
              { value: 'false', label: 'Inativa' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
};
