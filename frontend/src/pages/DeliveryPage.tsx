import React, { useEffect, useState, useMemo } from 'react';
import { useSalesStore, useCashSessionStore, useProductsStore, useCustomersStore } from '@/store';
import { apiClient } from '@/services/api';
import { Truck, Plus, Minus, Trash2, UserPlus, Printer, MapPin, Clock } from 'lucide-react';
import type { Product, Customer } from '@/types';
import './DeliveryPage.css';

export const DeliveryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Cliente e endereço
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  
  // Produto e busca
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightQuantity, setWeightQuantity] = useState('');
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  
  // Modal de novo cliente
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    referencePoint: '',
  });
  
  // Pagamento e checkout
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [payments, setPayments] = useState<Array<{ method: string; amount: number }>>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [discountValue, setDiscountValue] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Pedidos
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  
  const salesStore = useSalesStore();
  const { currentSession, loadSession } = useCashSessionStore();
  const { products, loadProducts } = useProductsStore();
  const { customers, loadCustomers } = useCustomersStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerAddresses(selectedCustomer);
      calculateDeliveryFee();
    } else {
      setCustomerAddresses([]);
      setSelectedAddress('');
      setDeliveryFee(0);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedAddress) {
      calculateDeliveryFee();
    }
  }, [selectedAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.querySelector('.delivery-page__customer-search-group');
      if (container && !container.contains(event.target as Node)) {
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
      await Promise.all([
        loadProducts(),
        loadCustomers(),
        loadSession(),
        loadOrders(),
      ]);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await apiClient.get('/delivery/orders');
      setOrders(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    }
  };

  const loadCustomerAddresses = async (customerId: string) => {
    try {
      const response = await apiClient.get(`/customers/${customerId}`);
      const customer = response.data;

      if (!customer) {
        console.error('Cliente não encontrado');
        setCustomerAddresses([]);
        return;
      }

      const primaryAddress = {
        id: 'primary',
        street: customer.street || '',
        number: customer.number || '',
        complement: customer.complement || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        referencePoint: customer.referencePoint || '',
        isDefault: true,
      };

      const hasAddress =
        primaryAddress.street ||
        primaryAddress.neighborhood ||
        primaryAddress.city ||
        primaryAddress.state ||
        primaryAddress.zipCode;

      const addresses = hasAddress ? [primaryAddress] : [];

      setCustomerAddresses(addresses);
      if (addresses.length > 0) {
        setSelectedAddress(addresses[0].id);
      } else {
        setSelectedAddress('');
      }
    } catch (err) {
      console.error('Erro ao carregar endereços:', err);
      setCustomerAddresses([]);
    }
  };

  const calculateDeliveryFee = async () => {
    if (!selectedAddress) {
      setDeliveryFee(0);
      return;
    }

    try {
      const address = customerAddresses.find(a => a.id === selectedAddress);
      if (!address) return;

      const response = await apiClient.post('/delivery/calculate-fee', {
        neighborhood: address.neighborhood,
        city: address.city,
        subtotal: subtotal,
      });
      
      setDeliveryFee(response.data.fee || 0);
    } catch (err) {
      console.error('Erro ao calcular taxa:', err);
      setDeliveryFee(5.00); // Taxa padrão
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    
    const search = productSearchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
    );
  }, [products, productSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.cpf?.toLowerCase().includes(search) ||
        c.whatsapp?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [customers, customerSearchTerm]);

  const selectedCustomerData = useMemo(
    () => customers.find((c) => c.id === selectedCustomer),
    [customers, selectedCustomer]
  );

  const selectedAddressData = useMemo(
    () => customerAddresses.find((a) => a.id === selectedAddress),
    [customerAddresses, selectedAddress]
  );

  const formattedDeliveryAddress = useMemo(() => {
    const source = selectedAddressData || {
      street: selectedCustomerData?.street,
      number: selectedCustomerData?.number,
      complement: selectedCustomerData?.complement,
      neighborhood: selectedCustomerData?.neighborhood,
      city: selectedCustomerData?.city,
      state: selectedCustomerData?.state,
      zipCode: selectedCustomerData?.zipCode,
    };

    const parts = [
      source?.street,
      source?.number,
      source?.complement,
      source?.neighborhood,
      source?.zipCode,
      source?.city,
      source?.state,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'Nenhum endereço cadastrado';
  }, [selectedAddressData, selectedCustomerData]);

  const handleAddItem = (product: Product) => {
    if (product.saleType === 'weight') {
      setSelectedWeightProduct(product);
      setWeightQuantity('');
      setIsWeightModalOpen(true);
      return;
    }

    const price = typeof product.salePrice === 'number' 
      ? product.salePrice 
      : parseFloat(product.salePrice as string) || 0;
    
    salesStore.addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      saleType: product.saleType,
    });
  };

  const handleConfirmWeight = () => {
    if (!selectedWeightProduct) return;
    
    const quantity = parseFloat(weightQuantity) || 0;
    if (quantity <= 0) {
      setError('Quantidade deve ser maior que 0');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const price = typeof selectedWeightProduct.salePrice === 'number' 
      ? selectedWeightProduct.salePrice 
      : parseFloat(selectedWeightProduct.salePrice as string) || 0;
    
    const totalPrice = quantity * price;
    
    salesStore.addItem({
      id: `${selectedWeightProduct.id}-${Date.now()}`,
      productId: selectedWeightProduct.id,
      productName: selectedWeightProduct.name,
      quantity: quantity,
      unitPrice: price,
      totalPrice: totalPrice,
      saleType: selectedWeightProduct.saleType,
    });

    setSuccess(`${selectedWeightProduct.name} adicionado ao carrinho!`);
    setTimeout(() => setSuccess(null), 2000);
    
    setIsWeightModalOpen(false);
    setSelectedWeightProduct(null);
    setWeightQuantity('');
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      salesStore.updateItem(itemId, quantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    salesStore.removeItem(itemId);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/customers', customerForm);
      const newCustomer = response.data.data;
      
      await loadCustomers();
      setSelectedCustomer(newCustomer.id);
      setCustomerSearchTerm('');
      setIsCustomerSearchOpen(false);
      setIsNewCustomerModalOpen(false);
      setSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      setCustomerForm({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        cpf: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        referencePoint: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar cliente');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(currentPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Digite um valor válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount }]);
    setCurrentPaymentAmount('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (!currentSession || currentSession.status !== 'open') {
      setError('Nenhum caixa aberto. Abra um caixa para continuar.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (salesStore.items.length === 0) {
      setError('Adicione ao menos um item ao pedido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!selectedCustomer) {
      setError('Selecione um cliente para o delivery');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!selectedAddress) {
      setError('Selecione um endereço para entrega');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (payments.length === 0) {
      setError('Adicione ao menos uma forma de pagamento');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - total) > 0.01) {
      setError(`Valor pago (R$ ${totalPaid.toFixed(2)}) diferente do total (R$ ${total.toFixed(2)})`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const orderData = {
        customerId: selectedCustomer,
        customerAddressId: selectedAddress,
        cashSessionId: currentSession.id,
        items: salesStore.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryFee,
        discount: discountValue,
        estimatedTime,
        customerNotes: customerNotes || undefined,
        internalNotes: internalNotes || undefined,
      };

      await apiClient.post('/delivery/orders', orderData);
      
      setSuccess('Pedido criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Limpar carrinho e formulário
      salesStore.items.forEach(item => salesStore.removeItem(item.id));
      setPayments([]);
      setDiscountValue(0);
      setCustomerNotes('');
      setInternalNotes('');
      setSelectedCustomer('');
      setSelectedAddress('');
      setIsCheckoutModalOpen(false);
      
      await loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar pedido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.put(`/delivery/orders/${orderId}/status`, { status });
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      await loadOrders();
      
      if (selectedOrder?.id === orderId) {
        const updated = orders.find(o => o.id === orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar status');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePrintOrder = (order: any) => {
    const address = order.customerAddress || {};
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 11px; margin: 5mm; width: 70mm; }
            .header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
            .header h1 { font-size: 14px; margin: 0 0 2mm 0; font-weight: bold; }
            .header p { margin: 1mm 0; font-size: 10px; }
            .delivery-badge { background: #10b981; color: white; padding: 2mm 4mm; border-radius: 3mm; font-weight: bold; margin: 3mm 0; display: inline-block; }
            .section { margin: 3mm 0; padding: 2mm 0; }
            .section-title { font-weight: bold; margin-bottom: 2mm; border-bottom: 1px solid #ddd; padding-bottom: 1mm; }
            .address { font-size: 10px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
            th { text-align: left; border-bottom: 1px solid #000; padding-bottom: 2mm; font-size: 10px; }
            td { padding: 2mm 0; border-bottom: 1px dashed #ddd; font-size: 10px; }
            .totals { margin-top: 3mm; padding-top: 3mm; border-top: 1px solid #000; }
            .total-row { display: flex; justify-content: space-between; margin: 2mm 0; }
            .final-total { font-weight: bold; font-size: 12px; margin-top: 3mm; padding-top: 3mm; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #000; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GELATINI</h1>
            <p>Gelados & Açaí</p>
            <p>Tel: (00) 0000-0000</p>
            <div class="delivery-badge">🚚 DELIVERY</div>
          </div>

          <div class="section">
            <div class="section-title">Pedido #${order.orderNumber}</div>
            <p style="font-size: 10px; margin: 1mm 0;">Data: ${new Date(order.orderedAt).toLocaleString('pt-BR')}</p>
            <p style="font-size: 10px; margin: 1mm 0;">Cliente: ${order.customer?.name || 'N/A'}</p>
            <p style="font-size: 10px; margin: 1mm 0;">Telefone: ${order.customer?.phone || 'N/A'}</p>
          </div>

          <div class="section">
            <div class="section-title">📍 Endereço de Entrega</div>
            <div class="address">
              <p>${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}</p>
              <p>${address.neighborhood} - ${address.city}/${address.state}</p>
              <p>CEP: ${address.zipCode || 'N/A'}</p>
              ${address.referencePoint ? `<p>Ref: ${address.referencePoint}</p>` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Itens do Pedido</div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qtd</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map((item: any) => `
                  <tr>
                    <td>${item.productName}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">R$ ${parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>R$ ${parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Taxa de Entrega:</span>
              <span>R$ ${parseFloat(order.deliveryFee).toFixed(2)}</span>
            </div>
            ${parseFloat(order.discount) > 0 ? `
              <div class="total-row">
                <span>Desconto:</span>
                <span>-R$ ${parseFloat(order.discount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row final-total">
              <span>TOTAL:</span>
              <span>R$ ${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>

          ${order.customerNotes ? `
            <div class="section">
              <div class="section-title">Observações do Cliente</div>
              <p style="font-size: 10px;">${order.customerNotes}</p>
            </div>
          ` : ''}

          ${order.internalNotes ? `
            <div class="section">
              <div class="section-title">Observações Internas</div>
              <p style="font-size: 10px;">${order.internalNotes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>⏱️ Tempo estimado: ${order.estimatedTime || 30} minutos</p>
            <p>Obrigado pela preferência!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      received: 'Recebido',
      preparing: 'Preparando',
      out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: '#3b82f6',
      preparing: '#f59e0b',
      out_for_delivery: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const subtotal = salesStore.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal + deliveryFee - discountValue;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const missingAmount = Math.max(0, total - totalPaid);
  const changeAmount = Math.max(0, totalPaid - total);

  if (loading) return <div className="delivery-page__loading">Carregando...</div>;

  return (
    <div className="delivery-page">
      <div className="delivery-page__header">
        <Truck size={32} />
        <h1 className="delivery-page__title">Sistema de Delivery</h1>
      </div>

      {error && (
        <div className="delivery-page__alert delivery-page__alert--danger">
          {error}
          <button onClick={() => setError(null)} className="delivery-page__alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="delivery-page__alert delivery-page__alert--success">
          {success}
          <button onClick={() => setSuccess(null)} className="delivery-page__alert-close">✕</button>
        </div>
      )}

      <div className="delivery-page__grid">
        {/* Produtos */}
        <div className="delivery-page__products">
          <div className="delivery-page__products-header">
            <h2>Produtos</h2>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="delivery-page__search-input"
            />
          </div>
          <div className="delivery-page__products-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="delivery-page__product-card"
                onClick={() => handleAddItem(product)}
              >
                <div className="delivery-page__product-image">
                  {product.image ? <img src={product.image} alt={product.name} /> : '🍦'}
                </div>
                <p className="delivery-page__product-name">{product.name}</p>
                <p className="delivery-page__product-price">
                  R$ {(typeof product.salePrice === 'number' ? product.salePrice : parseFloat(product.salePrice as string) || 0).toFixed(2)}
                  {product.saleType === 'weight' ? '/kg' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carrinho */}
        <div className="delivery-page__cart">
          <h2>Carrinho</h2>
          
          {salesStore.items.length === 0 ? (
            <p className="delivery-page__cart-empty">Carrinho vazio</p>
          ) : (
            <>
              <div className="delivery-page__cart-items">
                {salesStore.items.map((item) => (
                  <div key={item.id} className="delivery-page__cart-item">
                    <div className="delivery-page__cart-item-info">
                      <span className="delivery-page__cart-item-name">{item.productName}</span>
                      <span className="delivery-page__cart-item-price">
                        R$ {item.unitPrice.toFixed(2)}{item.saleType === 'weight' ? '/kg' : ''}
                      </span>
                    </div>
                    <div className="delivery-page__cart-item-actions">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - (item.saleType === 'weight' ? 0.1 : 1))}
                        className="delivery-page__cart-item-btn"
                        title="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="delivery-page__cart-item-qty">
                        {item.saleType === 'weight' ? item.quantity.toFixed(3) : item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + (item.saleType === 'weight' ? 0.1 : 1))}
                        className="delivery-page__cart-item-btn"
                        title="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="delivery-page__cart-item-btn delivery-page__cart-item-btn--remove"
                        title="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="delivery-page__cart-item-total">
                      R$ {item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="delivery-page__cart-customer">
                <label>
                  <span>Cliente:</span>
                  <div className="delivery-page__customer-search-group">
                    {selectedCustomerData && (
                      <div className="delivery-page__customer-selected">
                        <div className="delivery-page__customer-selected-name">{selectedCustomerData.name}</div>
                        <div className="delivery-page__customer-selected-info">
                          {selectedCustomerData.cpf || selectedCustomerData.phone || selectedCustomerData.whatsapp || selectedCustomerData.email || 'Dados não informados'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomer('');
                            setSelectedAddress('');
                            setCustomerSearchTerm('');
                          }}
                          className="delivery-page__customer-remove"
                          title="Remover cliente"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="delivery-page__customer-search-input-wrapper">
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        placeholder="Buscar cliente por nome, CPF ou telefone..."
                        className="delivery-page__customer-search-input"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="delivery-page__customer-add-button"
                        title="Cadastrar novo cliente"
                      >
                        <UserPlus size={18} />
                      </button>

                      {isCustomerSearchOpen && (
                        <div className="delivery-page__customer-search-results">
                          {filteredCustomers.length > 0 ? (
                            <>
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={() => {
                                    setSelectedCustomer(customer.id);
                                    setSelectedAddress('');
                                    setCustomerSearchTerm('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="delivery-page__customer-search-item"
                                >
                                  <span className="delivery-page__customer-search-item-name">{customer.name}</span>
                                  <span className="delivery-page__customer-search-item-info">{customer.cpf || customer.phone || customer.whatsapp || customer.email}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setSelectedCustomer('');
                                  setSelectedAddress('');
                                  setCustomerSearchTerm('');
                                  setIsCustomerSearchOpen(false);
                                }}
                                className="delivery-page__customer-search-item delivery-page__customer-search-item--final"
                              >
                                Consumidor Final
                              </button>
                            </>
                          ) : customerSearchTerm ? (
                            <div className="delivery-page__customer-search-empty">Nenhum cliente encontrado</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {selectedCustomer && (
                  <label>
                    <span>Endereço de Entrega:</span>
                    <select
                      value={selectedAddress}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      className="delivery-page__select"
                    >
                      <option value="">Selecione um endereço</option>
                      {customerAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.street}, {addr.number} - {addr.neighborhood}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedCustomerData && (
                  <div className="delivery-page__delivery-info">
                    <h4>Informações para Entrega</h4>
                    <p><strong>Nome Completo:</strong> {selectedCustomerData.name || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> {selectedCustomerData.phone || selectedCustomerData.whatsapp || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {formattedDeliveryAddress}</p>
                  </div>
                )}
              </div>

              <div className="delivery-page__cart-totals">
                <div className="delivery-page__cart-total-row">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="delivery-page__cart-total-row">
                    <span>Desconto:</span>
                    <span>-R$ {discountValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="delivery-page__cart-total-row delivery-page__cart-total-final">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="delivery-page__btn-checkout"
                disabled={!selectedCustomer || !selectedAddress}
              >
                Finalizar Pedido
              </button>
            </>
          )}
        </div>

        {/* Pedidos */}
        <div className="delivery-page__orders">
          <h2>Pedidos Ativos</h2>
          <div className="delivery-page__orders-list">
            {orders.filter(o => o.deliveryStatus !== 'delivered' && o.deliveryStatus !== 'cancelled').map((order) => (
              <div
                key={order.id}
                className="delivery-page__order-card"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsOrderDetailsOpen(true);
                }}
              >
                <div className="delivery-page__order-header">
                  <span className="delivery-page__order-number">Pedido #{order.orderNumber}</span>
                  <span
                    className={`delivery-page__order-status delivery-page__order-status--${order.deliveryStatus}`}
                  >
                    {getStatusLabel(order.deliveryStatus)}
                  </span>
                </div>
                <div className="delivery-page__order-info">
                  <p><strong>{order.customer?.name}</strong></p>
                  <p className="delivery-page__order-time">
                    <Clock size={14} />
                    {new Date(order.orderedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="delivery-page__order-total">R$ {parseFloat(order.total).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Peso */}
      {isWeightModalOpen && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal">
            <h3>Digite a quantidade em Kg</h3>
            <p>{selectedWeightProduct?.name}</p>
            <input
              type="number"
              step="0.001"
              value={weightQuantity}
              onChange={(e) => setWeightQuantity(e.target.value)}
              placeholder="0.000"
              className="delivery-page__input"
              autoFocus
            />
            <div className="delivery-page__modal-actions">
              <button onClick={() => setIsWeightModalOpen(false)} className="delivery-page__btn-cancel">
                Cancelar
              </button>
              <button onClick={handleConfirmWeight} className="delivery-page__btn-confirm">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Cliente */}
      {isNewCustomerModalOpen && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Cadastrar Novo Cliente</h3>
            <form onSubmit={handleCreateCustomer} className="delivery-page__customer-form">
              <div className="delivery-page__form-grid">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="tel"
                  placeholder="Telefone *"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="WhatsApp"
                  value={customerForm.whatsapp}
                  onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                  className="delivery-page__input"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="delivery-page__input"
                />
              </div>
              <h4>Endereço</h4>
              <div className="delivery-page__form-grid">
                <input
                  type="text"
                  placeholder="CEP"
                  value={customerForm.zipCode}
                  onChange={(e) => setCustomerForm({ ...customerForm, zipCode: e.target.value })}
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Rua *"
                  value={customerForm.street}
                  onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Número *"
                  value={customerForm.number}
                  onChange={(e) => setCustomerForm({ ...customerForm, number: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={customerForm.complement}
                  onChange={(e) => setCustomerForm({ ...customerForm, complement: e.target.value })}
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Bairro *"
                  value={customerForm.neighborhood}
                  onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Cidade *"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Estado *"
                  value={customerForm.state}
                  onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                  required
                  maxLength={2}
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Ponto de referência"
                  value={customerForm.referencePoint}
                  onChange={(e) => setCustomerForm({ ...customerForm, referencePoint: e.target.value })}
                  className="delivery-page__input"
                />
              </div>
              <div className="delivery-page__modal-actions">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="delivery-page__btn-cancel"
                >
                  Cancelar
                </button>
                <button type="submit" className="delivery-page__btn-confirm">
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutModalOpen && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Finalizar Pedido</h3>
            
            <div className="delivery-page__checkout-section">
              <h4>Pagamento</h4>
              <div className="delivery-page__payment-form">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="delivery-page__select"
                  title="Forma de pagamento"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
                  value={currentPaymentAmount}
                  onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                  className="delivery-page__input"
                />
                <button onClick={handleAddPayment} className="delivery-page__btn-add">
                  Adicionar
                </button>
              </div>

              {payments.length > 0 && (
                <div className="delivery-page__payment-list">
                  {payments.map((p, i) => (
                    <div key={i} className="delivery-page__payment-item">
                      <span>{p.method === 'cash' ? 'Dinheiro' : p.method === 'credit_card' ? 'Crédito' : p.method === 'debit_card' ? 'Débito' : 'PIX'}</span>
                      <span>R$ {p.amount.toFixed(2)}</span>
                      <button onClick={() => handleRemovePayment(i)} className="delivery-page__btn-remove" title="Remover pagamento">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="delivery-page__payment-status">
                <div>Total: R$ {total.toFixed(2)}</div>
                <div>Pago: R$ {totalPaid.toFixed(2)}</div>
                {missingAmount > 0 && <div className="delivery-page__payment-missing">Falta: R$ {missingAmount.toFixed(2)}</div>}
                {changeAmount > 0 && <div className="delivery-page__payment-change">Troco: R$ {changeAmount.toFixed(2)}</div>}
              </div>
            </div>

            <div className="delivery-page__checkout-section">
              <h4>Detalhes da Entrega</h4>
              <label>
                <span>Tempo Estimado (min):</span>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                  className="delivery-page__input"
                />
              </label>
              <label>
                <span>Observações do Cliente:</span>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Sem cebola, ponto da carne, etc..."
                  className="delivery-page__textarea"
                  rows={2}
                />
              </label>
              <label>
                <span>Observações Internas:</span>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas para a cozinha ou entregador..."
                  className="delivery-page__textarea"
                  rows={2}
                />
              </label>
            </div>

            <div className="delivery-page__modal-actions">
              <button onClick={() => setIsCheckoutModalOpen(false)} className="delivery-page__btn-cancel">
                Cancelar
              </button>
              <button
                onClick={handleCheckout}
                className="delivery-page__btn-confirm"
                disabled={missingAmount > 0}
              >
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      {isOrderDetailsOpen && selectedOrder && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Pedido #{selectedOrder.orderNumber}</h3>
            
            <div className="delivery-page__order-details">
              <div className="delivery-page__order-detail-section">
                <h4>Status Atual</h4>
                <div className="delivery-page__status-buttons">
                  {['received', 'preparing', 'out_for_delivery', 'delivered'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                      className={`delivery-page__status-btn delivery-page__status-btn--${status} ${selectedOrder.deliveryStatus === status ? 'active' : ''}`}
                      title={`Alterar status para ${getStatusLabel(status)}`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Itens do Pedido</h4>
                {(selectedOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="delivery-page__order-item">
                    <span>{item.quantity}x {item.productName}</span>
                    <span>R$ {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Total</h4>
                <div className="delivery-page__order-totals">
                  <div><span>Subtotal:</span><span>R$ {parseFloat(selectedOrder.subtotal).toFixed(2)}</span></div>
                  <div><span>Taxa:</span><span>R$ {parseFloat(selectedOrder.deliveryFee).toFixed(2)}</span></div>
                  <div><strong>Total:</strong><strong>R$ {parseFloat(selectedOrder.total).toFixed(2)}</strong></div>
                </div>
              </div>
            </div>

            <div className="delivery-page__modal-actions">
              <button onClick={() => setIsOrderDetailsOpen(false)} className="delivery-page__btn-cancel">
                Fechar
              </button>
              <button onClick={() => handlePrintOrder(selectedOrder)} className="delivery-page__btn-confirm">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;
