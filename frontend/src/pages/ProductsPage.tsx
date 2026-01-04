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
    category: '',
    available: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProducts();
      setProducts(response.data || response);
    } catch (err) {
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        available: form.available,
      };

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
      setForm({ name: '', description: '', price: '', category: '', available: true });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar produto');
    }
  };

  const handleEdit = (product: Product) => {
    const categoryName = typeof product.category === 'string' ? product.category : (product.category as any)?.name || '';
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: (product.sale_price || product.price || 0).toString(),
      category: categoryName,
      available: product.is_active !== undefined ? product.is_active : product.available !== undefined ? product.available : true,
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
            setForm({ name: '', description: '', price: '', category: '', available: true });
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
                <span className="products-page__info-value">R$ {(product.sale_price || product.price || 0).toFixed(2)}</span>
              </div>
              <div className="products-page__info-row">
                <span className="products-page__info-label">Categoria:</span>
                <span className="products-page__info-value">{getCategoryName(product.category)}</span>
              </div>
              <div className="products-page__info-row">
                <span className="products-page__info-label">Status:</span>
                <span className={`products-page__status ${product.is_active || product.available ? 'products-page__status--available' : 'products-page__status--unavailable'}`}>
                  {product.is_active || product.available ? 'Disponível' : 'Indisponível'}
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
              <label className="products-page__form-label">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="products-page__form-select"
                title="Selecione a categoria"
                required
              >
                <option value="">Selecione uma categoria</option>
                <option value="sorvete">Sorvete</option>
                <option value="bebida">Bebida</option>
                <option value="sobremesa">Sobremesa</option>
                <option value="outro">Outro</option>
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
