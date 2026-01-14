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
  const [togglingStatusIds, setTogglingStatusIds] = useState<Record<string, boolean>>({});
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    code: '',
    category: '',
    sizePrices: {} as Record<string, string>,
    available: true,
    saleType: 'unit' as 'unit' | 'weight',
    eligibleForLoyalty: false,
    loyaltyPointsMultiplier: 1,
    earnsCashback: false,
    cashbackPercentage: null as number | null,
  });

  const selectedCategory = categories.find((c) => c.id === form.category);
  const isAssembledCategory = selectedCategory?.categoryType === 'assembled';

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
      const costPriceValue = form.costPrice.trim() ? parseFloat(form.costPrice) : NaN;
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

      const assembled = selectedCategory?.categoryType === 'assembled';

      let sizePricesPayload: Array<{ sizeId: string; price: number }> | undefined;
      let effectiveSalePrice = priceValue;

      if (assembled) {
        const sizes = selectedCategory?.sizes || [];
        if (sizes.length === 0) {
          setError('Categoria Montado não possui tamanhos cadastrados');
          return;
        }

        sizePricesPayload = sizes
          .map((s) => ({
            sizeId: s.id,
            price: parseFloat(form.sizePrices[s.id] || ''),
          }))
          .filter((sp) => Number.isFinite(sp.price) && sp.price > 0);

        if (!sizePricesPayload.length || sizePricesPayload.length !== sizes.length) {
          setError('Informe o preço para todos os tamanhos da categoria Montado');
          return;
        }

        // Regra Montado (opção 2): salePrice é sempre o menor preço por tamanho.
        effectiveSalePrice = Math.min(...sizePricesPayload.map((sp) => sp.price));
      } else {
        if (!editingId && (Number.isNaN(priceValue) || priceValue <= 0)) {
          setError('Preço deve ser maior que zero');
          return;
        }
      }

      if (form.costPrice.trim() && (Number.isNaN(costPriceValue) || costPriceValue <= 0)) {
        setError('Preço de custo deve ser maior que zero');
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
      if (!Number.isNaN(effectiveSalePrice) && effectiveSalePrice > 0) productData.salePrice = effectiveSalePrice;
      if (!Number.isNaN(costPriceValue) && costPriceValue > 0) {
        productData.costPrice = costPriceValue;
      } else if (editingId && !form.costPrice.trim()) {
        // Permite limpar preço de custo na edição
        productData.costPrice = null;
      }
      if (categoryId) productData.categoryId = categoryId;
      if (assembled && sizePricesPayload) productData.sizePrices = sizePricesPayload;

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
        costPrice: '',
        code: '', 
        category: '', 
        sizePrices: {},
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
      price: (product.salePrice ?? 0).toString(),
      costPrice: product.costPrice !== undefined && product.costPrice !== null ? String(product.costPrice) : '',
      code: product.code || '',
      category: categoryValue || '',
      sizePrices: Array.isArray((product as any).sizePrices)
        ? (product as any).sizePrices.reduce((acc: any, sp: any) => {
            acc[sp.categorySizeId] = String(sp.price);
            return acc;
          }, {})
        : {},
      available: product.isActive !== undefined ? product.isActive : true,
      saleType: (product.saleType || 'unit') as 'unit' | 'weight',
      eligibleForLoyalty: product.eligibleForLoyalty || false,
      loyaltyPointsMultiplier: parseFloat(String(product.loyaltyPointsMultiplier || 1)),
      earnsCashback: product.earns_cashback || false,
      cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : null,
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

  const handleToggleStatus = async (product: Product) => {
    if (!product?.id) return;
    const id = product.id;
    if (togglingStatusIds[id]) return;

    const nextIsActive = !Boolean(product.isActive);
    setTogglingStatusIds((p) => ({ ...p, [id]: true }));
    setError(null);

    // Optimistic UI update
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: nextIsActive } : p)));

    try {
      await apiClient.updateProduct(id, { isActive: nextIsActive });
      setSuccess(nextIsActive ? 'Produto marcado como disponível' : 'Produto marcado como indisponível');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      // Revert optimistic update
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !nextIsActive } : p)));
      setError(err?.response?.data?.message || 'Erro ao atualizar status do produto');
      setTimeout(() => setError(null), 3000);
    } finally {
      setTogglingStatusIds((p) => {
        const copy = { ...p };
        delete copy[id];
        return copy;
      });
    }
  };

  const resolveProductCategory = (product: Product): Category | null => {
    const cat = product.category as any;
    if (cat && typeof cat === 'object') return cat as Category;

    const maybeId =
      (product as any).category_id ||
      (product as any).categoryId ||
      product.categoryId ||
      (typeof product.category === 'string' ? product.category : undefined);

    if (maybeId && isUuid(String(maybeId))) {
      return categories.find((c) => c.id === String(maybeId)) ?? null;
    }
    return null;
  };

  const formatCurrency = (value: unknown) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return `R$ ${safe.toFixed(2)}`;
  };

  const getAssembledSizePriceLines = (product: Product): Array<{ key: string; sizeName: string; price: number }> => {
    const category = resolveProductCategory(product);
    const sizes = Array.isArray(category?.sizes) ? category!.sizes! : [];

    const raw = Array.isArray((product as any).sizePrices) ? (product as any).sizePrices : [];

    const lines = raw
      .map((sp: any) => {
        const sizeId =
          sp?.categorySizeId ||
          sp?.category_size_id ||
          sp?.sizeId ||
          sp?.size_id ||
          sp?.categorySize?.id ||
          sp?.categorySizeId;
        const sizeName =
          sp?.categorySize?.name ||
          sizes.find((s: any) => String(s.id) === String(sizeId))?.name ||
          'Tamanho';
        const price = Number(sp?.price);
        if (!Number.isFinite(price) || price <= 0) return null;
        return { key: String(sizeId || `${sizeName}-${price}`), sizeName: String(sizeName || 'Tamanho'), price };
      })
      .filter(Boolean) as Array<{ key: string; sizeName: string; price: number }>;

    // If we have displayOrder, sort by it.
    const byOrder = new Map<string, number>();
    for (const s of sizes) {
      byOrder.set(String(s.id), Number(s.displayOrder ?? 0));
    }

    return lines.sort((a, b) => {
      const ao = byOrder.get(a.key) ?? 0;
      const bo = byOrder.get(b.key) ?? 0;
      if (ao !== bo) return ao - bo;
      return a.sizeName.localeCompare(b.sizeName);
    });
  };

  const normalizeSearch = (value: unknown) => {
    const s = String(value ?? '').trim().toLowerCase();
    try {
      return s.normalize('NFD').replace(new RegExp('\\p{Diacritic}', 'gu'), '');
    } catch {
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = normalizeSearch(searchTerm);
    if (!term) return true;

    const category = resolveProductCategory(p);

    const haystack = [
      p.code,
      p.name,
      p.description,
      category?.name,
      typeof p.category === 'string' ? p.category : undefined,
    ]
      .filter(Boolean)
      .map(normalizeSearch)
      .join(' ');

    return haystack.includes(term);
  });

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
            setForm({ 
              name: '', 
              description: '', 
              price: '', 
              costPrice: '',
              code: '', 
              category: '', 
              sizePrices: {},
              available: true, 
              saleType: 'unit',
              eligibleForLoyalty: false,
              loyaltyPointsMultiplier: 1,
              earnsCashback: false,
              cashbackPercentage: null
            });
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
          placeholder="Buscar por código, nome, descrição ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="products-page__search-input"
        />
      </div>

      <div className="products-page__hint" role="note">
        Dica: clique no <strong>Status</strong> para alternar entre <strong>Disponível</strong> e <strong>Indisponível</strong>.
      </div>

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th className="products-col-code">Código</th>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Status</th>
              <th className="products-col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const category = resolveProductCategory(product);
              const isAssembled = (category as any)?.categoryType === 'assembled';
              const assembledLines = isAssembled ? getAssembledSizePriceLines(product) : [];

              return (
                <tr key={product.id}>
                  <td className="products-code">{product.code || '-'}</td>
                  <td className="products-name">
                    <div className="products-name__title">{product.name}</div>
                    {product.description && <div className="products-name__desc">{product.description}</div>}
                  </td>
                  <td>{category?.name || getCategoryName(product.category)}</td>
                  <td className="products-price">
                    {isAssembled ? (
                      assembledLines.length > 0 ? (
                        <div className="products-price-sizes">
                          {assembledLines.map((line, idx) => (
                            <span key={line.key} className="products-price-size">
                              <strong>{line.sizeName}:</strong> {formatCurrency(line.price)}
                              {idx < assembledLines.length - 1 ? ' | ' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>{formatCurrency(product.salePrice)}</span>
                      )
                    ) : (
                      <span>{formatCurrency(product.salePrice)}</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`products-status ${product.isActive ? 'products-status--available' : 'products-status--unavailable'}`}
                      title={product.isActive ? 'Clique para marcar como indisponível' : 'Clique para marcar como disponível'}
                      aria-label={product.isActive ? 'Marcar produto como indisponível' : 'Marcar produto como disponível'}
                      onClick={() => handleToggleStatus(product)}
                      disabled={Boolean(togglingStatusIds[product.id])}
                    >
                      {Boolean(togglingStatusIds[product.id])
                        ? 'Salvando...'
                        : product.isActive
                          ? 'Disponível'
                          : 'Indisponível'}
                    </button>
                  </td>
                  <td>
                    <div className="products-actions">
                      <button
                        onClick={() => handleEdit(product)}
                        className="products-action-button products-action-button--edit"
                        title="Editar"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="products-action-button products-action-button--delete"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                required={!isAssembledCategory}
                disabled={isAssembledCategory}
              />
              {isAssembledCategory && (
                <small className="products-page__form-hint">
                  Para categoria Montado, o preço é por tamanho.
                </small>
              )}
            </div>

            <div className="products-page__form-group">
              <label className="products-page__form-label">Preço de Custo (opcional)</label>
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                className="products-page__form-input"
                title="Preço de custo do produto"
                placeholder="Ex: 5.50"
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
                onChange={(e) => {
                  const nextCategoryId = e.target.value;
                  const nextCategory = categories.find((c) => c.id === nextCategoryId);
                  const assembled = nextCategory?.categoryType === 'assembled';
                  const sizes = nextCategory?.sizes || [];
                  setForm((prev) => {
                    const nextMap: Record<string, string> = assembled ? { ...prev.sizePrices } : {};
                    if (assembled) {
                      for (const s of sizes) {
                        if (nextMap[s.id] === undefined) nextMap[s.id] = '';
                      }
                    }
                    return { ...prev, category: nextCategoryId, sizePrices: nextMap };
                  });
                }}
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

            {isAssembledCategory && (
              <div className="products-page__form-section">
                <h3 className="products-page__form-section-title">📏 Preços por tamanho</h3>
                {(selectedCategory?.sizes || []).map((size) => (
                  <div key={size.id} className="products-page__form-group">
                    <label className="products-page__form-label">
                      {size.name} (máx. sabores: {size.maxFlavors})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sizePrices[size.id] || ''}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          sizePrices: { ...p.sizePrices, [size.id]: e.target.value },
                        }))
                      }
                      className="products-page__form-input"
                      placeholder="0,00"
                      required
                    />
                  </div>
                ))}
              </div>
            )}

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
