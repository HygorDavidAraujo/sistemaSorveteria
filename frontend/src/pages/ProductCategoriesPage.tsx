import React, { useEffect, useMemo, useState } from 'react';
import { FolderTree, Plus, Save, Trash2 } from 'lucide-react';
import { apiClient } from '@/services/api';
import { Alert, Badge, Button, Card, Input, Loading, Modal, Select } from '@/components/common';
import type { Category, ProductCategoryType } from '@/types';
import './ProductCategoriesPage.css';

type SizeForm = {
  id?: string;
  name: string;
  maxFlavors: string;
};

const CATEGORY_TYPE_LABEL: Record<ProductCategoryType, string> = {
  common: 'Comum',
  assembled: 'Montado',
};

export const ProductCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    displayOrder: '0',
    isActive: true,
    categoryType: 'common' as ProductCategoryType,
    sizes: [] as SizeForm[],
  });

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/categories');
      const list = response.data || response;
      setCategories(list);
    } catch {
      setError('Erro ao carregar categorias de produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => {
      const byOrder = (a.displayOrder || 0) - (b.displayOrder || 0);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      displayOrder: String(sorted.length),
      isActive: true,
      categoryType: 'common',
      sizes: [],
    });
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      displayOrder: String(cat.displayOrder ?? 0),
      isActive: cat.isActive,
      categoryType: (cat.categoryType || 'common') as ProductCategoryType,
        sizes: (cat.sizes || []).map((s) => ({ id: s.id, name: s.name, maxFlavors: String(s.maxFlavors) })),
    });
    setIsModalOpen(true);
  };

  const setCategoryType = (next: ProductCategoryType) => {
    setForm((p) => ({
      ...p,
      categoryType: next,
      sizes: next === 'assembled' ? (p.sizes.length ? p.sizes : [{ name: '', maxFlavors: '1' }]) : [],
    }));
  };

  const addSize = () => {
    setForm((p) => ({ ...p, sizes: [...p.sizes, { id: undefined, name: '', maxFlavors: '1' }] }));
  };

  const removeSize = (index: number) => {
    setForm((p) => ({ ...p, sizes: p.sizes.filter((_, i) => i !== index) }));
  };

  const updateSize = (index: number, patch: Partial<SizeForm>) => {
    setForm((p) => ({
      ...p,
      sizes: p.sizes.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        name: form.name.trim(),
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
        categoryType: form.categoryType,
      };

      if (form.description.trim()) payload.description = form.description.trim();

      if (form.categoryType === 'assembled') {
        payload.sizes = form.sizes
          .filter((s) => s.name.trim())
          .map((s, idx) => ({
            id: s.id,
            name: s.name.trim(),
            maxFlavors: Number(s.maxFlavors) || 1,
            displayOrder: idx,
          }));
      }

      if (editing) {
        await apiClient.put(`/categories/${editing.id}`, payload);
        setSuccess('Categoria atualizada com sucesso');
      } else {
        await apiClient.post('/categories', payload);
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
    <div className="product-categories-page">
      <div className="product-categories-header">
        <div className="page-header">
          <FolderTree size={28} />
          <h1>Categorias de Produtos</h1>
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
        <Card className="product-categories-card">
          <div className="product-categories-table-wrapper">
            <table className="product-categories-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Tamanhos</th>
                  <th>Status</th>
                  <th className="product-categories-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((cat) => {
                  const type = (cat.categoryType || 'common') as ProductCategoryType;
                  const sizes = cat.sizes || [];
                  const sizesLabel =
                    type === 'assembled'
                      ? sizes.length
                        ? sizes
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((s) => `${s.name} (${s.maxFlavors})`)
                            .join(' · ')
                        : '-'
                      : '-';

                  return (
                    <tr key={cat.id}>
                      <td className="product-categories-name">{cat.name}</td>
                      <td>
                        <Badge variant={type === 'assembled' ? 'warning' : 'secondary'}>
                          {CATEGORY_TYPE_LABEL[type]}
                        </Badge>
                      </td>
                      <td className="product-categories-muted">{sizesLabel}</td>
                      <td>
                        <Badge variant={cat.isActive ? 'success' : 'secondary'}>
                          {cat.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="product-categories-right">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(cat)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
          <div className="product-categories-modal-footer">
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
        <form onSubmit={handleSave} className="product-categories-form">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Input
            label="Ordem (opcional)"
            type="number"
            value={form.displayOrder}
            onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))}
            min={0}
          />
          <Select
            label="Tipo"
            value={form.categoryType}
            onChange={(e) => setCategoryType(e.target.value as ProductCategoryType)}
            options={[
              { value: 'common', label: 'Comum' },
              { value: 'assembled', label: 'Montado' },
            ]}
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

          {form.categoryType === 'assembled' && (
            <div className="product-categories-sizes">
              <div className="product-categories-sizes-header">
                <div>
                  <h3>Tamanhos</h3>
                  <p className="product-categories-muted">Informe o nome do tamanho e o máximo de sabores.</p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addSize}>
                  <Plus size={14} />
                  Adicionar tamanho
                </Button>
              </div>

              {form.sizes.length === 0 ? (
                <div className="product-categories-muted">Nenhum tamanho adicionado.</div>
              ) : (
                <div className="product-categories-sizes-grid">
                  {form.sizes.map((s, idx) => (
                    <div key={idx} className="product-categories-size-row">
                      <Input
                        label={`Tamanho ${idx + 1}`}
                        value={s.name}
                        onChange={(e) => updateSize(idx, { name: e.target.value })}
                        placeholder="Ex: P, M, G"
                        required
                      />
                      <Input
                        label="Max. sabores"
                        type="number"
                        value={s.maxFlavors}
                        onChange={(e) => updateSize(idx, { maxFlavors: e.target.value })}
                        min={1}
                        required
                      />
                      <div className="product-categories-size-actions">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeSize(idx)}
                          title="Remover tamanho"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
