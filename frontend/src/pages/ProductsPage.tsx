import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Select, Modal, Loading, Alert } from '@/components/common';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import type { Product, Category } from '@/types';
import './ProductsPage.css';

// Helper to get category name from string or Category object
const getCategoryName = (cat: any): string => {
  if (!cat) return 'N/A';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object' && 'name' in cat) return cat.name;
  return 'N/A';
};

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    code: '',
    category: '',
    available: true,
    saleType: 'unit' as 'unit' | 'weight',
    eligibleForLoyalty: false,
    loyaltyPointsMultiplier: 1,
    earnsCashback: false,
    cashbackPercentage: null as number | null,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;
      const list = Array.isArray(unwrap(response)) ? unwrap(response) : [];
      setCategories(list as Category[]);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProducts();
      const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;
      const raw = unwrap(response);
      const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
      setProducts(list as Product[]);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryId = isUuid(form.category) ? form.category : undefined;
      const priceValue = parseFloat(form.price);
      const codeSource = (form.code || form.name || '').trim();
      const normalizedCode = codeSource
        .replace(/\s+/g, '-')
        .replace(/[-]{2,}/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 50);

      if (!editingId && !normalizedCode) {
        setError('Código é obrigatório');
        return;
      }

      if (!editingId && (Number.isNaN(priceValue) || priceValue <= 0)) {
        setError('Preço deve ser maior que zero');
        return;
      }

      const productData: any = {
        name: form.name,
        description: form.description,
        saleType: form.saleType,
        isActive: form.available,
        eligibleForLoyalty: form.eligibleForLoyalty,
        loyaltyPointsMultiplier: form.loyaltyPointsMultiplier,
        earnsCashback: form.earnsCashback,
      };

      if (form.cashbackPercentage !== null && form.cashbackPercentage > 0) {
        productData.cashbackPercentage = form.cashbackPercentage;
      }

      if (!editingId || normalizedCode) productData.code = normalizedCode;
      if (!Number.isNaN(priceValue) && priceValue > 0) productData.salePrice = priceValue;
      if (categoryId) productData.categoryId = categoryId;

      if (editingId) {
        await apiClient.updateProduct(editingId, productData);
        setSuccess('Produto atualizado com sucesso!');
      } else {
        await apiClient.createProduct(productData);
        setSuccess('Produto criado com sucesso!');
      }

      loadProducts();
      setIsFormModalOpen(false);
      setEditingId(null);
      setForm({ 
        name: '', 
        description: '', 
        price: '', 
        code: '', 
        category: '', 
        available: true, 
        saleType: 'unit',
        eligibleForLoyalty: false,
        loyaltyPointsMultiplier: 1,
        earnsCashback: false,
        cashbackPercentage: null,
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar produto');
    }
  };

  const handleEdit = (product: Product) => {
    const categoryName = typeof product.category === 'string' ? product.category : (product.category as any)?.name || '';
    const categoryValue = (product as any).category_id || (product as any).categoryId || (product.category as any)?.id || categoryName;
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: (product.salePrice || product.sale_price || product.price || 0).toString(),
      code: (product as any).code || '',
      category: categoryValue || '',
      available: product.isActive !== undefined ? product.isActive : (product.is_active !== undefined ? product.is_active : (product.available !== undefined ? product.available : true)),
      saleType: (product as any).saleType || (product as any).sale_type || 'unit' as 'unit' | 'weight',
      eligibleForLoyalty: (product as any).eligibleForLoyalty || false,
      loyaltyPointsMultiplier: parseFloat((product as any).loyaltyPointsMultiplier || '1'),
      earnsCashback: (product as any).earnsCashback || false,
      cashbackPercentage: (product as any).cashbackPercentage ? parseFloat((product as any).cashbackPercentage) : null,
    });
    setEditingId(product.id);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        await apiClient.deleteProduct(id);
        setSuccess('Produto deletado com sucesso!');
        loadProducts();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Erro ao deletar produto');
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loading message="Carregando produtos..." />;

  return (
    <div className="products-page">
      <div className="products-page__header">
        <div className="products-page__header-title">
          <Package size={32} />
          <h1 className="products-page__title">Gerenciar Produtos</h1>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', description: '', price: '', code: '', category: '', available: true, saleType: 'unit' });
            setIsFormModalOpen(true);
          }}
          className="products-page__button products-page__button--primary"
        >
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      {error && (
        <div className="products-page__alert products-page__alert--danger">
          {error}
          <button onClick={() => setError(null)} className="products-page__alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="products-page__alert products-page__alert--success">
          {success}
          <button onClick={() => setSuccess(null)} className="products-page__alert-close">✕</button>
        </div>
      )}

      <div className="products-page__search">
        <input
          type="text"
          placeholder="Nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="products-page__search-input"
        />
      </div>

      <div className="products-page__grid">
        {filteredProducts.map((product) => (
          <div key={product.id} className="products-page__card">
            <div className="products-page__card-image-container">
              <div className="products-page__card-image">
                🍦
              </div>
            </div>
            <div className="products-page__card-content">
              <h3 className="products-page__card-title">{product.name}</h3>
              <p className="products-page__card-description">{product.description}</p>
            </div>

            <div className="products-page__card-info">
              <div className="products-page__info-row">
                <span className="products-page__info-label">Preço:</span>
                <span className="products-page__info-value">R$ {parseFloat(product.salePrice || product.sale_price || product.price || 0).toFixed(2)}</span>
              </div>
              <div className="products-page__info-row">
                <span className="products-page__info-label">Categoria:</span>
                <span className="products-page__info-value">{getCategoryName(product.category)}</span>
              </div>
              <div className="products-page__info-row">
                <span className="products-page__info-label">Status:</span>
                <span className={`products-page__status ${product.isActive || product.is_active || product.available ? 'products-page__status--available' : 'products-page__status--unavailable'}`}>
                  {product.isActive || product.is_active || product.available ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
            </div>

            <div className="products-page__card-actions">
              <button
                onClick={() => handleEdit(product)}
                className="products-page__button products-page__button--secondary"
              >
                <Edit size={16} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="products-page__button products-page__button--danger"
                title="Deletar produto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="products-page__empty">
          <p className="products-page__empty-text">Nenhum produto encontrado</p>
        </div>
      )}

      {/* Form Modal */}
      <div className={`products-page__modal ${isFormModalOpen ? 'products-page__modal--open' : ''}`}>
        <div className="products-page__modal-overlay" onClick={() => setIsFormModalOpen(false)} />
        <div className="products-page__modal-content">
          <div className="products-page__modal-header">
            <h2 className="products-page__modal-title">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="products-page__modal-close"
            >
              ✕
            </button>
          </div>

          <form className="products-page__modal-form" onSubmit={handleSubmit}>
            <div className="products-page__form-group">
              <label className="products-page__form-label">Nome do Produto</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="products-page__form-input"
                title="Nome do produto"
                required
              />
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="products-page__form-input"
                title="Descrição do produto"
              />
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Preço</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="products-page__form-input"
                title="Preço do produto"
                required
              />
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Código</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="products-page__form-input"
                title="Código interno ou SKU"
                required
              />
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="products-page__form-select"
                title="Selecione a categoria"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Tipo de Produto</label>
              <select
                value={form.saleType}
                onChange={(e) => setForm({ ...form, saleType: e.target.value as 'unit' | 'weight' })}
                className="products-page__form-select"
                title="Tipo de venda do produto"
              >
                <option value="unit">Unidade</option>
                <option value="weight">Peso (Balança)</option>
              </select>
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-checkbox">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
                Disponível para venda
              </label>
            </div>

            {/* Loyalty Section */}
            <div className="products-page__form-section">
              <h3 className="products-page__form-section-title">⭐ Programa de Lealdade</h3>
              
              <div className="products-page__form-group">
                <label className="products-page__form-checkbox">
                  <input
                    type="checkbox"
                    checked={form.eligibleForLoyalty}
                    onChange={(e) => setForm({ ...form, eligibleForLoyalty: e.target.checked })}
                  />
                  Elegível para Pontos de Lealdade
                </label>
                <small className="products-page__form-hint">
                  Clientes ganham pontos ao comprar este produto
                </small>
              </div>

              {form.eligibleForLoyalty && (
                <div className="products-page__form-group">
                  <label className="products-page__form-label">Multiplicador de Pontos</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={form.loyaltyPointsMultiplier}
                    onChange={(e) => setForm({ ...form, loyaltyPointsMultiplier: parseFloat(e.target.value) || 1 })}
                    className="products-page__form-input"
                    title="Multiplicador de pontos (1 = normal, 2 = dobro)"
                  />
                  <small className="products-page__form-hint">
                    Ex: 2.0 = cliente ganha o dobro de pontos neste produto
                  </small>
                </div>
              )}
            </div>

            {/* Cashback Section */}
            <div className="products-page__form-section">
              <h3 className="products-page__form-section-title">💰 Cashback</h3>
              
              <div className="products-page__form-group">
                <label className="products-page__form-checkbox">
                  <input
                    type="checkbox"
                    checked={form.earnsCashback}
                    onChange={(e) => setForm({ ...form, earnsCashback: e.target.checked })}
                  />
                  Gera Cashback
                </label>
                <small className="products-page__form-hint">
                  Clientes recebem cashback ao comprar este produto
                </small>
              </div>

              {form.earnsCashback && (
                <div className="products-page__form-group">
                  <label className="products-page__form-label">Percentual de Cashback (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.cashbackPercentage || ''}
                    onChange={(e) => setForm({ ...form, cashbackPercentage: e.target.value ? parseFloat(e.target.value) : null })}
                    className="products-page__form-input"
                    placeholder="Usar padrão do sistema"
                    title="Percentual de cashback específico para este produto"
                  />
                  <small className="products-page__form-hint">
                    Deixe em branco para usar o percentual padrão das configurações
                  </small>
                </div>
              )}
            </div>

            <div className="products-page__modal-footer">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="products-page__button products-page__button--secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="products-page__button products-page__button--primary"
              >
                {editingId ? 'Atualizar' : 'Criar'} Produto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
