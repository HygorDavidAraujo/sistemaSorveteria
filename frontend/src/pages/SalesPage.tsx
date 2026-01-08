import React, { useEffect, useState, useMemo } from 'react';
import { useSalesStore, useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Modal, Loading, Alert, Badge } from '@/components/common';
import { Trash2, ShoppingCart, Plus, Minus, Printer } from 'lucide-react';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
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
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [payments, setPayments] = useState<Array<{ method: 'cash' | 'credit_card' | 'debit_card' | 'pix'; amount: number }>>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [pendingWeightProduct, setPendingWeightProduct] = useState<Product | null>(null);
  const [tempWeight, setTempWeight] = useState('');
  const [customerForm, setCustomerForm] = useState({
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

  const salesStore = useSalesStore();
  const { currentSession, loadSession } = useCashSessionStore();

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
        loadSession(),
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
    const isWeight = product.saleType === 'weight';
    
    if (isWeight) {
      setPendingWeightProduct(product);
      setTempWeight('');
      setIsWeightModalOpen(true);
    } else {
      const unitPrice = typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0);
      salesStore.addItem({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        saleType: product.saleType,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      });
    }
  };

  const handleConfirmWeight = () => {
    if (!pendingWeightProduct) return;

    const raw = tempWeight.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '').replace(',', '.');
    const weight = parseFloat(raw);

    if (isNaN(weight) || weight <= 0) {
      setError('Digite um peso válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const unitPrice = typeof pendingWeightProduct.salePrice === 'number' 
      ? pendingWeightProduct.salePrice 
      : (typeof pendingWeightProduct.salePrice === 'string' 
        ? parseFloat(pendingWeightProduct.salePrice) 
        : 0);

    salesStore.addItem({
      id: `${pendingWeightProduct.id}-${Date.now()}`,
      productId: pendingWeightProduct.id,
      productName: pendingWeightProduct.name,
      saleType: 'weight',
      quantity: weight,
      unitPrice,
      totalPrice: unitPrice * weight,
    });

    setIsWeightModalOpen(false);
    setPendingWeightProduct(null);
    setTempWeight('');
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    const item = useSalesStore.getState().items.find((i) => i.id === itemId);
    if (!item) return;

    let newQty = quantity;
    if (item.saleType === 'weight') {
      newQty = Math.max(0.001, parseFloat(newQty.toFixed(3)));
    } else {
      newQty = Math.max(1, Math.floor(newQty));
    }

    salesStore.updateItem(itemId, newQty);
  };

  const handleRemoveItem = (itemId: string) => {
    salesStore.removeItem(itemId);
  };

  const getCustomerName = () => {
    if (!selectedCustomer) return 'Consumidor Final';
    const customer = customers.find(c => c.id === selectedCustomer);
    return customer ? `${customer.name} (${customer.cpf || customer.phone})` : 'Consumidor Final';
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/customers', customerForm);
      const newCustomer = response.data.data || response.data;
      
      await loadData();
      setSelectedCustomer(newCustomer.id);
      setIsNewCustomerModalOpen(false);
      setSuccess('Cliente cadastrado e vinculado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      setCustomerForm({
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
      setCustomerSearchTerm('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar cliente');
      setTimeout(() => setError(null), 3000);
    }
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

  const { totalPaid, missingAmount, changeAmount } = useMemo(() => {
    const totalPaidCalc = payments.reduce((sum, p) => sum + p.amount, 0);
    const missing = Math.max(0, total - totalPaidCalc);
    const change = Math.max(0, totalPaidCalc - total);
    return {
      totalPaid: parseFloat(totalPaidCalc.toFixed(2)),
      missingAmount: parseFloat(missing.toFixed(2)),
      changeAmount: parseFloat(change.toFixed(2)),
    };
  }, [payments, total]);

  const handleAddPayment = () => {
    const parsed = parseFloat(currentPaymentAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Digite um valor de pagamento válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount: parseFloat(parsed.toFixed(2)) }]);
    setCurrentPaymentAmount('');
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão Crédito',
      debit_card: 'Cartão Débito',
      pix: 'PIX',
    };
    return labels[method] || method;
  };

  const handlePrintPreview = () => {
    if (salesStore.items.length === 0) {
      setError('Nenhum item no carrinho para imprimir');
      setTimeout(() => setError(null), 2500);
      return;
    }

    const customerName = getCustomerName();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');

    const itemsHTML = salesStore.items.map((item) => {
      const qtyLabel = item.saleType === 'weight'
        ? `${item.quantity.toFixed(3)} kg`
        : `${item.quantity}x`;
      const unit = formatCurrency(item.unitPrice);
      const lineTotal = formatCurrency(item.totalPrice);
      return `
        <tr>
          <td class="print-table-item-name">
            <div>${item.productName}</div>
            <div class="print-table-item-detail">${qtyLabel} · ${unit}</div>
          </td>
          <td class="print-table-col-qty">${qtyLabel}</td>
          <td class="print-table-col-total">${lineTotal}</td>
        </tr>
      `;
    }).join('');

    const paymentsHTML = payments.length > 0 ? `
      <div class="print-section">
        <div class="print-section-title">Formas de Pagamento</div>
        ${payments.map((p) => `
          <div class="print-row">
            <span class="print-row-label">${getPaymentMethodLabel(p.method)}</span>
            <span class="print-row-value">${formatCurrency(p.amount)}</span>
          </div>
        `).join('')}
        <div class="print-row highlight total">
          <span class="print-row-label">Total Pago</span>
          <span class="print-row-value">${formatCurrency(totalPaid)}</span>
        </div>
        ${missingAmount > 0 ? `
          <div class="print-row" style="color: #d32f2f;">
            <span class="print-row-label">⚠️ Falta</span>
            <span class="print-row-value">${formatCurrency(missingAmount)}</span>
          </div>
        ` : ''}
        ${changeAmount > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Troco</span>
            <span class="print-row-value">${formatCurrency(changeAmount)}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    const content = `
      <div class="print-header">
        <div class="print-header-title">PRÉ-CONTA</div>
        <div class="print-header-subtitle">Gelatini - Gelados & Açaí</div>
        <div class="print-header-info">Cliente: ${customerName}</div>
        <div class="print-header-info">Data: ${dateStr} ${timeStr}</div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="print-table-col-qty">Qtd</th>
            <th class="print-table-col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="print-totals">
        <div class="print-row">
          <span class="print-row-label">Subtotal:</span>
          <span class="print-row-value">${formatCurrency(subtotal)}</span>
        </div>
        ${discountValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(discountValue)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(total)}</span>
        </div>
      </div>

      ${paymentsHTML}

      <div class="print-footer">
        <div class="print-footer-text">Prévia para conferência do cliente</div>
        <div class="print-footer-line">Documento não fiscal</div>
        <div class="print-footer-line">Gelatini © 2024</div>
      </div>
    `;

    printReceipt({
      title: 'Pré-Conta - Venda PDV',
      subtitle: 'Gelatini - Gelados & Açaí',
      content
    });
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    try {
      if (!currentSession || currentSession.status !== 'open') {
        setError('Nenhum caixa aberto. Abra um caixa para continuar.');
        return;
      }

      if (salesStore.items.length === 0) {
        setError('Adicione itens ao carrinho');
        return;
      }

      if (payments.length === 0) {
        setError('Adicione ao menos uma forma de pagamento');
        return;
      }

      if (Math.abs(totalPaid - total) > 0.01) {
        setError(`Valor pago (R$ ${totalPaid.toFixed(2)}) diferente do total (R$ ${total.toFixed(2)})`);
        return;
      }

      await apiClient.createSale({
        cashSessionId: currentSession.id,
        customerId: selectedCustomer || undefined,
        saleType: 'pdv',
        items: salesStore.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discount: 0,
        })),
        payments: payments.map((p) => ({ paymentMethod: p.method, amount: p.amount })),
        discount: discountValue,
        deliveryFee: 0,
        loyaltyPointsUsed: 0,
        couponCode: discountCode || undefined,
      });

      setSuccess('Venda finalizada com sucesso!');
      salesStore.clear();
      setSelectedCustomer('');
      setDiscountCode('');
      setDiscountValue(0);
      setPaymentMethod('cash');
      setPayments([]);
      setCurrentPaymentAmount('');
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
                      {item.saleType === 'weight' ? (
                        <>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 0.1)}
                            className="sales-page__cart-item-btn"
                            title="Diminuir quantidade (peso)"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="text"
                            title="Quantidade em kg (ex: 1,500)"
                            placeholder="0,000"
                            value={weightInputs[item.id] !== undefined ? weightInputs[item.id] : item.quantity.toFixed(3).replace('.', ',')}
                            onChange={(e) => {
                              setWeightInputs({ ...weightInputs, [item.id]: e.target.value });
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '');
                              const raw = val.replace(',', '.');
                              const parsed = parseFloat(raw);
                              if (!isNaN(parsed) && parsed > 0) {
                                handleUpdateQuantity(item.id, parsed);
                              }
                              setWeightInputs({ ...weightInputs, [item.id]: undefined });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="sales-page__cart-item-quantity"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 0.1)}
                            className="sales-page__cart-item-btn"
                            title="Aumentar quantidade (peso)"
                          >
                            <Plus size={14} />
                          </button>
                          <span className="sales-page__cart-item-total">
                            R$ {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="sales-page__cart-item-btn"
                            title="Diminuir quantidade"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            title="Quantidade do item"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                            className="sales-page__cart-item-quantity"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="sales-page__cart-item-btn"
                            title="Aumentar quantidade"
                          >
                            <Plus size={14} />
                          </button>
                          <span className="sales-page__cart-item-total">
                            R$ {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </>
                      )}
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
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="sales-page__customer-add-button"
                    title="Cadastrar novo cliente"
                  >
                    +
                  </button>

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

          {salesStore.items.length > 0 && (
            <div className="sales-page__payment-section">
              <h3 className="sales-page__payment-title">Pagamentos</h3>

              <div className="sales-page__payment-input-group">
                <select
                  title="Selecione a forma de pagamento"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sales-page__payment-select"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão Crédito</option>
                  <option value="debit_card">Cartão Débito</option>
                  <option value="pix">PIX</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={currentPaymentAmount}
                  onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                  className="sales-page__payment-amount-input"
                />

                <button
                  onClick={handleAddPayment}
                  className="sales-page__payment-add-btn"
                >
                  +
                </button>
              </div>

              {payments.length > 0 && (
                <div className="sales-page__payment-items">
                  {payments.map((p, index) => (
                    <div key={`${p.method}-${index}`} className="sales-page__payment-item">
                      <span className="sales-page__payment-item-method">
                        {p.method === 'cash'
                          ? 'Dinheiro'
                          : p.method === 'credit_card'
                            ? 'Cartão Crédito'
                            : p.method === 'debit_card'
                              ? 'Cartão Débito'
                              : 'PIX'}
                      </span>
                      <span className="sales-page__payment-item-amount">R$ {p.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="sales-page__payment-item-remove"
                        title="Remover pagamento"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="sales-page__payment-status">
                <div className="sales-page__payment-status-row">
                  <span>Total da venda</span>
                  <span className="sales-page__payment-total">R$ {total.toFixed(2)}</span>
                </div>
                <div className="sales-page__payment-status-row">
                  <span>Total pago</span>
                  <span className="sales-page__payment-total">R$ {totalPaid.toFixed(2)}</span>
                </div>
                {missingAmount > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--missing">
                    <span>Falta pagar</span>
                    <span className="sales-page__payment-missing">R$ {missingAmount.toFixed(2)}</span>
                  </div>
                )}
                {changeAmount > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--change">
                    <span>Troco</span>
                    <span className="sales-page__payment-change">R$ {changeAmount.toFixed(2)}</span>
                  </div>
                )}
                {missingAmount === 0 && changeAmount === 0 && payments.length > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--complete">
                    <span>Pagamento completo</span>
                    <span className="sales-page__payment-total">OK</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {salesStore.items.length > 0 && (
            <div className="sales-page__cart-buttons">
              <button
                onClick={handlePrintPreview}
                className="sales-page__print-preview-button"
                title="Imprimir pré-conta para o cliente"
              >
                <Printer size={18} /> Pré-conta
              </button>
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="sales-page__checkout-button"
              >
                Finalizar Venda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Customer Modal */}
      <div className={`sales-page__modal ${isNewCustomerModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsNewCustomerModalOpen(false)} />
        <div className="sales-page__modal-content sales-page__modal-content--large">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Cadastrar Novo Cliente</h2>
            <button
              onClick={() => setIsNewCustomerModalOpen(false)}
              className="sales-page__modal-close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateCustomer} className="sales-page__customer-form">
            <div className="sales-page__form-section">
              <h3 className="sales-page__form-section-title">Informações Pessoais</h3>
              
              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Nome *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="Nome completo"
                />
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">CPF</label>
                  <input
                    type="text"
                    value={customerForm.cpf}
                    onChange={(e) => setCustomerForm({...customerForm, cpf: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Data de Nascimento</label>
                  <input
                    type="date"
                    value={customerForm.birthDate}
                    onChange={(e) => setCustomerForm({...customerForm, birthDate: e.target.value})}
                    className="sales-page__form-input"
                    title="Data de nascimento"
                    placeholder="Data de nascimento"
                  />
                </div>
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Telefone</label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">WhatsApp</label>
                  <input
                    type="tel"
                    value={customerForm.whatsapp}
                    onChange={(e) => setCustomerForm({...customerForm, whatsapp: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="sales-page__form-section">
              <h3 className="sales-page__form-section-title">Endereço</h3>
              
              <div className="sales-page__form-row">
                <div className="sales-page__form-group sales-page__form-group--flex">
                  <label className="sales-page__form-label">Rua</label>
                  <input
                    type="text"
                    value={customerForm.street}
                    onChange={(e) => setCustomerForm({...customerForm, street: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Rua"
                    title="Nome da rua"
                  />
                </div>
                <div className="sales-page__form-group sales-page__form-group--small">
                  <label className="sales-page__form-label">Nº</label>
                  <input
                    type="text"
                    value={customerForm.number}
                    onChange={(e) => setCustomerForm({...customerForm, number: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="123"
                    title="Número do endereço"
                  />
                </div>
              </div>

              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Complemento</label>
                <input
                  type="text"
                  value={customerForm.complement}
                  onChange={(e) => setCustomerForm({...customerForm, complement: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="Apto, sala, etc"
                />
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Bairro</label>
                  <input
                    type="text"
                    value={customerForm.neighborhood}
                    onChange={(e) => setCustomerForm({...customerForm, neighborhood: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Bairro"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Cidade</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Estado</label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">CEP</label>
                  <input
                    type="text"
                    value={customerForm.zipCode}
                    onChange={(e) => setCustomerForm({...customerForm, zipCode: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>

            <div className="sales-page__modal-footer">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="sales-page__modal-button sales-page__modal-button--cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="sales-page__modal-button sales-page__modal-button--confirm"
              >
                Cadastrar Cliente
              </button>
            </div>
          </form>
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

            <div className="sales-page__selected-payments">
              <p className="sales-page__selected-payments-title">Pagamentos Selecionados</p>
              {payments.length === 0 && <div>Nenhum pagamento adicionado</div>}
              {payments.map((p, index) => (
                <div key={`${p.method}-${index}`} className="sales-page__selected-payment-item">
                  <span className="sales-page__selected-payment-method">
                    {p.method === 'cash'
                      ? 'Dinheiro'
                      : p.method === 'credit_card'
                        ? 'Cartão Crédito'
                        : p.method === 'debit_card'
                          ? 'Cartão Débito'
                          : 'PIX'}
                  </span>
                  <span className="sales-page__selected-payment-amount">R$ {p.amount.toFixed(2)}</span>
                </div>
              ))}

              <div className="sales-page__selected-payment-total">
                <span>Total Pago</span>
                <span>R$ {totalPaid.toFixed(2)}</span>
              </div>
              {missingAmount > 0 && (
                <div className="sales-page__selected-payment-missing">
                  <span>Falta</span>
                  <span>R$ {missingAmount.toFixed(2)}</span>
                </div>
              )}
              {changeAmount > 0 && (
                <div className="sales-page__selected-payment-change">
                  <span>Troco</span>
                  <span>R$ {changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
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

      {/* Weight Modal */}
      <div className={`sales-page__modal ${isWeightModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsWeightModalOpen(false)} />
        <div className="sales-page__modal-content sales-page__modal-content--small">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Capturar Peso - {pendingWeightProduct?.name}</h2>
            <button
              onClick={() => setIsWeightModalOpen(false)}
              className="sales-page__modal-close"
            >
              ✕
            </button>
          </div>

          <div className="sales-page__modal-body">
            <div className="sales-page__weight-section">
              <label className="sales-page__weight-label">Peso (kg)</label>
              <input
                type="text"
                placeholder="0,000"
                value={tempWeight}
                onChange={(e) => setTempWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmWeight();
                  }
                }}
                className="sales-page__weight-input"
              />
              <p className="sales-page__weight-hint">Digite o peso ou clique em "Ler da Balança"</p>

              <div className="sales-page__weight-actions">
                <button
                  onClick={() => {
                    setError('Integração com balança Toledo Prix 3 Fit ainda em desenvolvimento');
                    setTimeout(() => setError(null), 3000);
                  }}
                  className="sales-page__weight-button sales-page__weight-button--scale"
                >
                  📊 Ler da Balança
                </button>
              </div>
            </div>
          </div>

          <div className="sales-page__modal-footer">
            <button
              onClick={() => setIsWeightModalOpen(false)}
              className="sales-page__modal-button sales-page__modal-button--cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmWeight}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
