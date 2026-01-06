import React, { useEffect, useState, useMemo } from 'react';
import { useSalesStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Modal, Loading, Alert, Badge } from '@/components/common';
import { Trash2, ShoppingCart } from 'lucide-react';
import type { Product, Customer } from '@/types';
import './SalesPage.css';

export const SalesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountValue, setDiscountValue] = useState(0);

  const salesStore = useSalesStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.sales-page__customer-search-group');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };

    if (isCustomerSearchOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isCustomerSearchOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResponse, customersResponse] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getCustomers(),
      ]);
      setProducts(productsResponse.data || productsResponse);
      setCustomers(customersResponse.data || customersResponse);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.includes(search) ||
        c.cpf?.includes(search) ||
        c.whatsapp?.includes(search) ||
        c.email?.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [customers, customerSearchTerm]);

  const handleAddItem = (product: Product) => {
    salesStore.addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0),
      totalPrice: typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0),
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      salesStore.updateItem(itemId, quantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    salesStore.removeItem(itemId);
  };

  const getCustomerName = () => {
    if (!selectedCustomer) return 'Consumidor Final';
    const customer = customers.find(c => c.id === selectedCustomer);
    return customer ? `${customer.name} (${customer.cpf || customer.phone})` : 'Consumidor Final';
  };

  const handleApplyCoupon = async () => {
    if (!discountCode) return;
    try {
      const response = await apiClient.validateCoupon(discountCode);
      if (response && response.discount_value) {
        setDiscountValue(response.discount_value);
        setSuccess('Cupom aplicado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Cupom inválido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const { subtotal, total } = useMemo(() => {
    const subtotal = salesStore.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal - discountValue;
    return { subtotal, total: Math.max(0, total) };
  }, [salesStore.items, discountValue]);

  const handleCheckout = async () => {
    try {
      if (salesStore.items.length === 0) {
        setError('Adicione itens ao carrinho');
        return;
      }

      await apiClient.createSale({
        items: salesStore.items,
        customer_id: selectedCustomer || null,
        payment_method: paymentMethod,
        discount_value: discountValue,
        total_amount: total,
        coupon_code: discountCode || null,
      });

      setSuccess('Venda finalizada com sucesso!');
      salesStore.clear();
      setSelectedCustomer('');
      setDiscountCode('');
      setDiscountValue(0);
      setPaymentMethod('cash');
      setIsCheckoutModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao finalizar venda');
    }
  };

  if (loading) return <Loading message="Carregando..." />;

  return (
    <div className="sales-page">
      <div className="sales-page__header">
        <ShoppingCart size={32} />
        <h1 className="sales-page__title">Sistema de Vendas</h1>
      </div>

      {error && (
        <div className="sales-page__alert sales-page__alert--danger">
          {error}
          <button onClick={() => setError(null)} className="sales-page__alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="sales-page__alert sales-page__alert--success">
          {success}
          <button onClick={() => setSuccess(null)} className="sales-page__alert-close">✕</button>
        </div>
      )}

      <div className="sales-page__grid">
        {/* Products */}
        <div className="sales-page__products">
          <div className="sales-page__products-header">
            <h2 className="sales-page__products-title">Produtos</h2>
            <span className="sales-page__products-hint">Clique para adicionar ao carrinho</span>
          </div>
          <div className="sales-page__products-grid">
            {products.map((product) => (
              <div
                key={product.id}
                className="sales-page__product-card"
                onClick={() => handleAddItem(product)}
              >
                <div className="sales-page__product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="sales-page__product-image-img"
                    />
                  ) : (
                    '🍦'
                  )}
                </div>
                <p className="sales-page__product-name">{product.name}</p>
                <p className="sales-page__product-price">R$ {(typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0)).toFixed(2)}</p>
                <span
                  className={`sales-page__product-status ${
                    product.isActive
                      ? 'sales-page__product-status--available'
                      : 'sales-page__product-status--unavailable'
                  }`}
                >
                  {product.isActive ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="sales-page__cart">
          <h2 className="sales-page__cart-title">Carrinho</h2>

          {/* Items */}
          <div className="sales-page__cart-items">
            {salesStore.items.length === 0 ? (
              <p className="sales-page__cart-empty">Nenhum item selecionado</p>
            ) : (
              salesStore.items.map((item) => (
                <div key={item.id} className="sales-page__cart-item">
                  <div className="sales-page__cart-item-info">
                    <p className="sales-page__cart-item-name">{item.productName}</p>
                    <div className="sales-page__cart-item-controls">
                      <input
                        type="number"
                        title="Quantidade do item"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                        className="sales-page__cart-item-quantity"
                      />
                      <span className="sales-page__cart-item-total">
                        R$ {(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="sales-page__cart-item-remove"
                    title="Remover item do carrinho"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Customer & Discount */}
          {salesStore.items.length > 0 && (
            <>
              <div className="sales-page__customer-search-group">
                <label className="sales-page__cart-section-label">Cliente (Opcional)</label>
                
                {selectedCustomer && (
                  <div className="sales-page__customer-selected">
                    {getCustomerName()}
                    <button
                      onClick={() => {
                        setSelectedCustomer('');
                        setCustomerSearchTerm('');
                      }}
                      className="sales-page__customer-remove"
                      title="Remover cliente selecionado"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="sales-page__customer-search-input-wrapper">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsCustomerSearchOpen(true);
                    }}
                    onFocus={() => setIsCustomerSearchOpen(true)}
                    placeholder="Buscar cliente por nome, CPF ou telefone..."
                    className="sales-page__customer-search-input"
                  />

                  {isCustomerSearchOpen && (
                    <div className="sales-page__customer-search-results">
                      {filteredCustomers.length > 0 ? (
                        <>
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => {
                                setSelectedCustomer(customer.id);
                                setCustomerSearchTerm('');
                                setIsCustomerSearchOpen(false);
                              }}
                              className="sales-page__customer-search-item"
                            >
                              <span className="sales-page__customer-search-item-name">
                                {customer.name}
                              </span>
                              <span className="sales-page__customer-search-item-info">
                                {customer.cpf || customer.phone}
                              </span>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedCustomer('');
                              setCustomerSearchTerm('');
                              setIsCustomerSearchOpen(false);
                            }}
                            className="sales-page__customer-search-item sales-page__customer-search-item--final"
                          >
                            Consumidor Final
                          </button>
                        </>
                      ) : customerSearchTerm ? (
                        <div className="sales-page__customer-search-empty">
                          Nenhum cliente encontrado
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="sales-page__cart-section">
                <label className="sales-page__cart-section-label">Cupom</label>
                <div className="sales-page__cart-coupon-inputs">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Código do cupom"
                    className="sales-page__cart-coupon-input"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="sales-page__cart-coupon-button"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Totals */}
          {salesStore.items.length > 0 && (
            <div className="sales-page__cart-totals">
              <div className="sales-page__cart-totals-row">
                <span className="sales-page__cart-totals-label">Subtotal:</span>
                <span className="sales-page__cart-totals-value">R$ {subtotal.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div className="sales-page__cart-totals-row sales-page__cart-totals-row--discount">
                  <span className="sales-page__cart-totals-label">Desconto:</span>
                  <span className="sales-page__cart-totals-value">-R$ {discountValue.toFixed(2)}</span>
                </div>
              )}
              <div className="sales-page__cart-totals-row sales-page__cart-totals-row--final">
                <span className="sales-page__cart-totals-label">Total:</span>
                <span className="sales-page__cart-totals-value">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {salesStore.items.length > 0 && (
            <div className="sales-page__cart-section">
              <label className="sales-page__cart-section-label">Forma de Pagamento</label>
              <select
                title="Selecione a forma de pagamento"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="sales-page__cart-section-select"
              >
                <option value="cash">Dinheiro</option>
                <option value="credit_card">Cartão Crédito</option>
                <option value="debit_card">Cartão Débito</option>
                <option value="pix">PIX</option>
              </select>
            </div>
          )}

          {salesStore.items.length > 0 && (
            <button
              onClick={() => setIsCheckoutModalOpen(true)}
              className="sales-page__checkout-button"
            >
              Finalizar Venda
            </button>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <div className={`sales-page__modal ${isCheckoutModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsCheckoutModalOpen(false)} />
        <div className="sales-page__modal-content">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Confirmar Venda</h2>
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="sales-page__modal-close"
            >
              ✕
            </button>
          </div>

          <div className="sales-page__modal-body">
            <div className="sales-page__modal-row">
              <span className="sales-page__modal-label">Subtotal:</span>
              <span className="sales-page__modal-value">R$ {subtotal.toFixed(2)}</span>
            </div>
            {discountValue > 0 && (
              <div className="sales-page__modal-row sales-page__modal-row--discount">
                <span className="sales-page__modal-label">Desconto:</span>
                <span className="sales-page__modal-value">-R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="sales-page__modal-row sales-page__modal-row--total">
              <span className="sales-page__modal-label">Total a Pagar:</span>
              <span className="sales-page__modal-value">R$ {total.toFixed(2)}</span>
            </div>
            <p className="sales-page__modal-payment-info">
              Forma de Pagamento: <strong>{paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod === 'credit_card' ? 'Cartão Crédito' : paymentMethod === 'debit_card' ? 'Cartão Débito' : 'PIX'}</strong>
            </p>
          </div>

          <div className="sales-page__modal-footer">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="sales-page__modal-button sales-page__modal-button--cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleCheckout}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
