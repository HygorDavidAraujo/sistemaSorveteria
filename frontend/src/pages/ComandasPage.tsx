import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, UserPlus, Printer } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCashSessionStore, useCustomersStore } from '@/store';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
import './ComandasPage.css';

interface ComandaItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observation?: string;
  status: 'PENDING' | 'READY' | 'SERVED';
}

interface Comanda {
  id: string;
  comandaNumber: number;
  tableNumber?: number;
  customerName?: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  items: ComandaItem[];
  subtotal: number;
  discount: number;
  total: number;
  openedAt: string;
  closedAt?: string;
}

interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  category: string;
}

const normalizeProduct = (product: any): Product => ({
  id: product?.id || '',
  name: product?.name || '',
  code: product?.code || undefined,
  description: product?.description || undefined,
  price: Number(product?.price ?? 0),
  category: product?.category || '',
});

const normalizeProductList = (data: any): Product[] => {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeProduct);
};

const normalizeComandaItem = (item: any): ComandaItem => ({
  id: item?.id || '',
  productId: item?.productId || '',
  productName: item?.productName || '',
  quantity: Number(item?.quantity ?? 0),
  unitPrice: Number(item?.unitPrice ?? 0),
  subtotal: Number(item?.subtotal ?? 0),
  observation: item?.observation || undefined,
  status: item?.status || 'PENDING',
});

const normalizeComanda = (comanda: any): Comanda => ({
  id: comanda?.id || '',
  comandaNumber: Number(comanda?.comandaNumber ?? 0),
  tableNumber: comanda?.tableNumber ?? undefined,
  customerName: comanda?.customerName || undefined,
  status: (comanda?.status || 'OPEN').toUpperCase() as 'OPEN' | 'CLOSED' | 'CANCELLED',
  items: Array.isArray(comanda?.items)
    ? comanda.items.map(normalizeComandaItem)
    : [],
  subtotal: Number(comanda?.subtotal ?? 0),
  discount: Number(comanda?.discount ?? 0),
  total: Number(comanda?.total ?? 0),
  openedAt: comanda?.openedAt || '',
  closedAt: comanda?.closedAt || undefined,
});

const normalizeComandaList = (data: any): Comanda[] => {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeComanda);
};

export const ComandasPage: React.FC = () => {
  const { currentSession, loadSession } = useCashSessionStore();
  const { customers, loadCustomers } = useCustomersStore();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isOpenComandaModalOpen, setIsOpenComandaModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Form states
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [discount, setDiscount] = useState('0');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
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
  
  // Payment states
  const [payments, setPayments] = useState<Array<{method: string; amount: number}>>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const search = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    );
  }, [products, productSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers
      .filter((c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.cpf?.toLowerCase().includes(search) ||
        c.whatsapp?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
      )
      .slice(0, 8);
  }, [customers, customerSearchTerm]);

  // Load data
  useEffect(() => {
    loadData();
    loadSession();
    loadCustomers();
  }, [loadSession, loadCustomers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.querySelector('.comanda-customer-search-group');
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
      const [comandasRes, productsRes] = await Promise.all([
        apiClient.get('/comandas'),
        apiClient.get('/products'),
      ]);

      // Extract data from response: { status: 'success', data: [...] }
      const rawComandas = Array.isArray(comandasRes.data)
        ? comandasRes.data
        : (comandasRes.data?.data || []);
      const rawProducts = Array.isArray(productsRes.data)
        ? productsRes.data
        : (productsRes.data?.data || []);

      setComandas(normalizeComandaList(rawComandas));
      setProducts(normalizeProductList(rawProducts));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Keep selected comanda in sync across list and detail
  const updateSelectedComandaState = (comandaData: Comanda) => {
    setSelectedComanda(comandaData);
    setComandas((prev) => prev.map((c) => (c.id === comandaData.id ? comandaData : c)));
  };

  const refreshSelectedComanda = async (comandaId: string) => {
    const updatedComanda = await apiClient.get(`/comandas/${comandaId}`);
    const comandaData = normalizeComanda(updatedComanda.data?.data || updatedComanda.data);
    updateSelectedComandaState(comandaData);
    return comandaData;
  };

  const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

  useEffect(() => {
    // Reset transient states when switching comandas
    setPayments([]);
    setCurrentPaymentAmount('');
    setPaymentMethod('cash');
    setDiscount(String(selectedComanda?.discount ?? '0'));
    setQuantityInputs({});
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setIsCustomerSearchOpen(false);
  }, [selectedComanda?.id]);

  const paymentSummary = useMemo(() => {
    const subtotalValue = selectedComanda?.subtotal || 0;
    const discountValue = selectedComanda?.status === 'OPEN'
      ? parseFloat(discount || '0')
      : selectedComanda?.discount || 0;
    const totalToPay = selectedComanda?.status === 'CLOSED'
      ? selectedComanda.total
      : Math.max(0, subtotalValue - discountValue);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, totalToPay - totalPaid);
    const change = Math.max(0, totalPaid - totalToPay);

    return {
      subtotalValue,
      discountValue,
      totalToPay,
      totalPaid,
      remaining,
      change,
      isPaid: totalPaid > 0 && remaining === 0,
    };
  }, [selectedComanda, discount, payments]);

  const handleOpenComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica se existe sessão de caixa aberta
    if (!currentSession?.id) {
      setError('Nenhuma sessão de caixa aberta. Por favor, abra o caixa primeiro.');
      return;
    }

    // Verifica se já existe uma comanda aberta com o mesmo número de mesa
    if (tableNumber) {
      const tableNumberNormalized = tableNumber.trim().toLowerCase();
      const existingComanda = comandas.find(
        (c) => c.status === 'OPEN' && 
        String(c.tableNumber ?? '').trim().toLowerCase() === tableNumberNormalized
      );
      
      if (existingComanda) {
        setError(`Já existe uma comanda aberta para ${tableNumber}. Por favor, feche ou use outra mesa.`);
        return;
      }
    }

    try {
      const response = await apiClient.post('/comandas', {
        cashSessionId: currentSession.id,
        tableNumber: tableNumber || undefined,
        customerName: customerName || undefined,
      });

      const newComanda = normalizeComanda(response.data?.data || response.data || response);
      setComandas([...comandas, newComanda]);
      setSuccess('Comanda aberta com sucesso!');
      setIsOpenComandaModalOpen(false);
      setTableNumber('');
      setCustomerName('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao abrir comanda');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda || !selectedProduct) {
      setError('Selecione um produto');
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    try {
      await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
        productId: selectedProduct,
        quantity: qty,
        observation: observation || undefined,
      });

      await refreshSelectedComanda(selectedComanda.id);

      setSuccess('Item adicionado com sucesso!');
      setIsAddItemModalOpen(false);
      setSelectedProduct('');
      setQuantity('1');
      setObservation('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar item');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedComanda) return;

    try {
      await apiClient.delete(`/comandas/${selectedComanda.id}/items/${itemId}`);
      await refreshSelectedComanda(selectedComanda.id);

      setSuccess('Item removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover item');
    }
  };

  const handleUpdateItemQuantity = async (item: ComandaItem, newQuantity: number) => {
    if (!selectedComanda || selectedComanda.status !== 'OPEN') return;

    const safeQuantity = Math.max(1, Number.isFinite(newQuantity) ? newQuantity : item.quantity);

    try {
      await apiClient.put(`/comandas/${selectedComanda.id}/items/${item.id}`, {
        quantity: safeQuantity,
      });

      await refreshSelectedComanda(selectedComanda.id);
      setQuantityInputs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setSuccess('Quantidade atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar quantidade');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/customers', customerForm);
      const newCustomer = response.data?.data || response.data;
      
      // Recarrega lista de clientes
      await loadCustomers();
      
      // Seleciona automaticamente o novo cliente
      setSelectedCustomerId(newCustomer.id);
      
      // Limpa o formulário
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
      
      setIsNewCustomerModalOpen(false);
      setSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar cliente');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddPayment = () => {
    const parsed = parseFloat((currentPaymentAmount || '').replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Digite um valor válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount: parseFloat(parsed.toFixed(2)) }]);
    setCurrentPaymentAmount('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'credit_card': return 'Cartão Crédito';
      case 'debit_card': return 'Cartão Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const handlePrintPreBill = () => {
    if (!selectedComanda) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const customerInfo = selectedCustomerId ? 
      customers.find(c => c.id === selectedCustomerId)?.name || 'Consumidor Final' : 
      selectedComanda.customerName || 'Consumidor Final';

    const itemsHTML = selectedComanda.items.map((item) => `
      <tr>
        <td class="print-table-item-name">${item.productName}</td>
        <td class="print-table-col-qty">${item.quantity.toFixed(3)}</td>
        <td class="print-table-col-price">R$ ${item.unitPrice.toFixed(2)}</td>
        <td class="print-table-col-total">R$ ${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const content = `
      <div class="print-header">
        <div class="print-header-title">PRÉ-CONTA</div>
        <div class="print-header-info" style="text-align: center; margin-top: 6px;">Comanda #${selectedComanda.comandaNumber}</div>
        ${selectedComanda.tableNumber ? `<div class=\"print-header-info\" style=\"text-align: center; margin-top: 4px;\">Mesa: ${selectedComanda.tableNumber}</div>` : ''}
        <div class="print-header-info" style="text-align: center; margin-top: 4px;">Data: ${dateStr} ${timeStr}</div>
      </div>

      <div class="print-section">
        <div class="print-row">
          <span class="print-row-label"><strong>Cliente:</strong></span>
          <span class="print-row-value">${customerInfo}</span>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="print-table-col-qty">Qtd</th>
            <th class="print-table-col-price">Valor</th>
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
          <span class="print-row-value">${formatCurrency(selectedComanda.subtotal)}</span>
        </div>
        ${selectedComanda.discount > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(selectedComanda.discount)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(selectedComanda.total)}</span>
        </div>
      </div>

      <div class="print-footer">
        <div class="print-footer-text">*** PRÉ-CONTA ***</div>
        <div class="print-footer-text">Documento não fiscal</div>
        <div class="print-footer-text">Conferência do cliente</div>
        <div class="print-footer-line">Gelatini © 2024</div>
      </div>
    `;

    printReceipt({
      title: 'Pré-Conta - Comanda #' + selectedComanda.comandaNumber,
      content
    });
  };

  const handleCloseComanda = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!selectedComanda) return;

    if (payments.length === 0) {
      setError('Adicione pelo menos uma forma de pagamento');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (paymentSummary.remaining > 0) {
      setError(`Faltam R$ ${paymentSummary.remaining.toFixed(2)} para pagar`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/close`, {
        discount: paymentSummary.discountValue,
        payments: payments.map(p => ({
          paymentMethod: p.method,
          amount: p.amount
        }))
      });

      const comandaData = normalizeComanda(response.data?.data || response.data);
      updateSelectedComandaState(comandaData);
      setSuccess('Comanda fechada com sucesso!');
      setDiscount('0');
      setPayments([]);
      setCurrentPaymentAmount('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fechar comanda');
    }
  };

  const handleReopenComanda = async (comandaId?: string) => {
    const comandaToReopen = comandaId 
      ? comandas.find(c => c.id === comandaId) 
      : selectedComanda;
    
    if (!comandaToReopen) return;

    const reason = window.prompt('Por favor, informe o motivo da reabertura da comanda:');
    if (!reason || reason.trim() === '') {
      setError('É necessário informar um motivo para reabrir a comanda');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await apiClient.post(`/comandas/${comandaToReopen.id}/reopen`, {
        reason: reason.trim()
      });
      const comandaData = normalizeComanda(response.data?.data || response.data);
      setComandas(comandas.map((c) => (c.id === comandaToReopen.id ? comandaData : c)));
      
      // Se é a comanda selecionada, atualiza também
      if (selectedComanda?.id === comandaToReopen.id) {
        setSelectedComanda(comandaData);
      }
      
      setSuccess('Comanda reaberta com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reabrir comanda');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancelComanda = async () => {
    if (!selectedComanda) return;

    const reason = window.prompt('Por favor, informe o motivo do cancelamento:');
    if (!reason || reason.trim() === '') {
      setError('É necessário informar um motivo para cancelar a comanda');
      return;
    }

    try {
      await apiClient.post(`/comandas/${selectedComanda.id}/cancel`, { reason: reason.trim() });
      setComandas(comandas.filter((c) => c.id !== selectedComanda.id));
      setSelectedComanda(null);
      setSuccess('Comanda cancelada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar comanda');
    }
  };

  if (loading) return <Loading message="Carregando comandas..." />;

  return (
    <div className="comandas-page">
      <div className="page-header">
        <ShoppingCart size={32} />
        <h1>Gerenciar Comandas</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="comandas-container">
        {/* Comandas List */}
        <div className="comandas-list-section">
          <div className="comandas-list-header">
            <h2>Comandas Ativas</h2>
            <Button variant="primary" onClick={() => setIsOpenComandaModalOpen(true)}>
              <Plus size={18} />
              Nova Comanda
            </Button>
          </div>

          <div className="comandas-grid">
            {comandas
              .filter((c) => c.status === 'OPEN')
              .map((comanda) => (
                <div
                  key={comanda.id}
                  className={`comanda-card ${
                    selectedComanda?.id === comanda.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedComanda(comanda)}
                >
                  <div className="comanda-card-header">
                    <div>
                      <h3 className="comanda-number">
                        #{comanda.comandaNumber}
                        {comanda.tableNumber && ` - Mesa ${comanda.tableNumber}`}
                      </h3>
                      {comanda.customerName && (
                        <p className="comanda-customer">{comanda.customerName}</p>
                      )}
                    </div>
                    <div className="comanda-status open">ABERTA</div>
                  </div>

                  <div className="comanda-card-items">
                    <p className="comanda-item-count">{comanda.items.length} itens</p>
                  </div>

                  <div className="comanda-card-footer">
                    <p className="comanda-total">
                      <strong>R$ {comanda.total.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
              ))}

            {comandas.filter((c) => c.status === 'OPEN').length === 0 && (
              <div className="comandas-empty">
                <p>Nenhuma comanda aberta</p>
              </div>
            )}
          </div>

          {comandas.some((c) => c.status === 'CLOSED') && (
            <>
              <h2 className="comandas-closed-title">Comandas Fechadas</h2>
              <div className="comandas-table-wrapper">
                <table className="comandas-table">
                  <thead>
                    <tr>
                      <th>Comanda</th>
                      <th>Mesa</th>
                      <th>Itens</th>
                      <th>Total</th>
                      <th>Fechado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas
                      .filter((c) => c.status === 'CLOSED')
                      .map((comanda) => (
                        <tr key={comanda.id}>
                          <td>#{comanda.comandaNumber}</td>
                          <td>{comanda.tableNumber || '-'}</td>
                          <td>{comanda.items.length}</td>
                          <td>R$ {comanda.total.toFixed(2)}</td>
                          <td>{new Date(comanda.closedAt || '').toLocaleString()}</td>
                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReopenComanda(comanda.id);
                              }}
                              className="comanda-reopen-btn"
                              title="Reabrir comanda para correções"
                            >
                              🔓 Reabrir
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Comanda Details */}
        {selectedComanda && (
          <div className="comanda-details-section">
            <Card>
              <div className="comanda-details-header">
                <div>
                  <h2>Comanda #{selectedComanda.comandaNumber}</h2>
                  {selectedComanda.tableNumber && (
                    <p className="comanda-details-subtitle">Mesa {selectedComanda.tableNumber}</p>
                  )}
                  {selectedComanda.customerName && (
                    <p className="comanda-details-subtitle">{selectedComanda.customerName}</p>
                  )}
                </div>

                <div className="comanda-details-status">
                  <div className={`status-badge ${selectedComanda.status.toLowerCase()}`}>
                    {selectedComanda.status === 'OPEN' ? 'ABERTA' : 'FECHADA'}
                  </div>
                </div>
              </div>

              <div className="comanda-cart">
                <div className="comanda-cart-header">
                  <h3>Itens da Comanda</h3>
                  {selectedComanda.status === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsAddItemModalOpen(true)}
                    >
                      <Plus size={16} />
                      Adicionar Item
                    </Button>
                  )}
                </div>

                <div className="comanda-cart-items">
                  {selectedComanda.items.length === 0 ? (
                    <p className="comanda-cart-empty">Nenhum item selecionado</p>
                  ) : (
                    selectedComanda.items.map((item) => (
                      <div key={item.id} className="comanda-cart-item">
                        <div className="comanda-cart-item-info">
                          <p className="comanda-cart-item-name">{item.productName}</p>
                          {item.observation && (
                            <p className="comanda-cart-item-observation">{item.observation}</p>
                          )}

                          {selectedComanda.status === 'OPEN' ? (
                            <div className="comanda-cart-item-controls">
                              <button
                                onClick={() => handleUpdateItemQuantity(item, item.quantity - 1)}
                                className="comanda-cart-item-btn"
                                title="Diminuir quantidade"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="text"
                                className="comanda-cart-item-quantity"
                                value={quantityInputs[item.id] !== undefined ? quantityInputs[item.id] : item.quantity.toString()}
                                onChange={(e) => setQuantityInputs({ ...quantityInputs, [item.id]: e.target.value })}
                                onBlur={(e) => {
                                  const raw = e.target.value.replace(',', '.');
                                  const parsed = parseFloat(raw);
                                  if (!isNaN(parsed) && parsed > 0) {
                                    handleUpdateItemQuantity(item, parsed);
                                  } else {
                                    setQuantityInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                title="Quantidade do item"
                              />
                              <button
                                onClick={() => handleUpdateItemQuantity(item, item.quantity + 1)}
                                className="comanda-cart-item-btn"
                                title="Aumentar quantidade"
                              >
                                <Plus size={14} />
                              </button>
                              <span className="comanda-cart-item-total">
                                {formatCurrency(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ) : (
                            <p className="comanda-cart-item-qty-readonly">
                              {item.quantity}x {formatCurrency(item.unitPrice)} — {formatCurrency(item.subtotal)}
                            </p>
                          )}
                        </div>

                        {selectedComanda.status === 'OPEN' && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="comanda-cart-item-remove"
                            title="Remover item"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="comanda-cart-section">
                  <label className="comanda-cart-section-label">Cliente (Opcional)</label>

                  <div className="comanda-customer-search-group">
                    {selectedCustomerId && (
                      <div className="comanda-customer-selected">
                        <div className="comanda-customer-selected-name">
                          {customers.find((c) => c.id === selectedCustomerId)?.name || 'Consumidor Final'}
                        </div>
                        <div className="comanda-customer-selected-info">
                          {customers.find((c) => c.id === selectedCustomerId)?.cpf || customers.find((c) => c.id === selectedCustomerId)?.phone || 'Dados não informados'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomerId('');
                            setCustomerSearchTerm('');
                          }}
                          className="comanda-customer-remove"
                          title="Remover cliente"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="comanda-customer-search-input-wrapper">
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        placeholder="Buscar cliente por nome, CPF ou telefone..."
                        className="comanda-customer-search-input"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="comanda-new-customer-btn"
                        title="Cadastrar novo cliente"
                      >
                        <UserPlus size={18} />
                      </button>

                      {isCustomerSearchOpen && (
                        <div className="comanda-customer-search-results">
                          {filteredCustomers.length > 0 ? (
                            <>
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={() => {
                                    setSelectedCustomerId(customer.id);
                                    setCustomerSearchTerm('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="comanda-customer-search-item"
                                >
                                  <span className="comanda-customer-search-item-name">{customer.name}</span>
                                  <span className="comanda-customer-search-item-info">{customer.cpf || customer.phone || customer.whatsapp || customer.email}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setSelectedCustomerId('');
                                  setCustomerSearchTerm('');
                                  setIsCustomerSearchOpen(false);
                                }}
                                className="comanda-customer-search-item comanda-customer-search-item--final"
                              >
                                Consumidor Final
                              </button>
                            </>
                          ) : customerSearchTerm ? (
                            <div className="comanda-customer-search-empty">Nenhum cliente encontrado</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedComanda.status === 'OPEN' && (
                  <div className="comanda-cart-section comanda-cart-discount">
                    <label className="comanda-cart-section-label">Desconto</label>
                    <input
                      type="text"
                      value={discount}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setDiscount(value);
                        }
                      }}
                      placeholder="0,00"
                      className="comanda-cart-discount-input"
                    />
                  </div>
                )}

                <div className="comanda-cart-totals">
                  <div className="comanda-cart-totals-row">
                    <span>Subtotal</span>
                    <span className="comanda-cart-totals-value">{formatCurrency(paymentSummary.subtotalValue)}</span>
                  </div>
                  {paymentSummary.discountValue > 0 && (
                    <div className="comanda-cart-totals-row comanda-cart-totals-row--discount">
                      <span>Desconto</span>
                      <span className="comanda-cart-totals-value">- {formatCurrency(paymentSummary.discountValue)}</span>
                    </div>
                  )}
                  <div className="comanda-cart-totals-row comanda-cart-totals-row--final">
                    <span>Total</span>
                    <span className="comanda-cart-totals-value">{formatCurrency(paymentSummary.totalToPay)}</span>
                  </div>
                </div>

                {selectedComanda.status === 'OPEN' && selectedComanda.items.length > 0 && (
                  <div className="comanda-payment-inline">
                    <div className="comanda-payment-inline-header">
                      <h3>Pagamentos</h3>
                      <span className="comanda-payment-inline-hint">Adicione pagamentos até cobrir o total</span>
                    </div>

                    <div className="comanda-payment-inline-inputs">
                      <select
                        title="Forma de pagamento"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="comanda-payment-select"
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
                        className="comanda-payment-amount-input"
                      />

                      <button
                        type="button"
                        onClick={handleAddPayment}
                        className="comanda-payment-add-btn"
                        title="Adicionar forma de pagamento"
                      >
                        +
                      </button>
                    </div>

                    {payments.length > 0 && (
                      <div className="comanda-payment-items">
                        {payments.map((payment, index) => (
                          <div key={index} className="comanda-payment-item">
                            <span className="comanda-payment-item-method">
                              {getPaymentMethodLabel(payment.method)}
                            </span>
                            <span className="comanda-payment-item-amount">
                              {formatCurrency(payment.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePayment(index)}
                              className="comanda-payment-item-remove"
                              title="Remover"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="comanda-payment-status">
                      <div className="comanda-payment-status-row">
                        <span>Total a pagar</span>
                        <span className="comanda-payment-total">{formatCurrency(paymentSummary.totalToPay)}</span>
                      </div>
                      <div className="comanda-payment-status-row">
                        <span>Total pago</span>
                        <span className="comanda-payment-total">{formatCurrency(paymentSummary.totalPaid)}</span>
                      </div>
                      {paymentSummary.remaining > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--missing">
                          <span>Faltando</span>
                          <span className="comanda-payment-missing">{formatCurrency(paymentSummary.remaining)}</span>
                        </div>
                      )}
                      {paymentSummary.change > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--change">
                          <span>Troco</span>
                          <span className="comanda-payment-change">{formatCurrency(paymentSummary.change)}</span>
                        </div>
                      )}
                      {paymentSummary.isPaid && paymentSummary.change === 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--complete">
                          <span>✓ Pagamento completo</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="comanda-cart-buttons">
                  <button
                    onClick={handlePrintPreBill}
                    className="comanda-print-preview-button"
                    title="Imprimir pré-conta"
                  >
                    <Printer size={18} />
                    Pré-Conta
                  </button>
                  <button
                    onClick={handleCloseComanda}
                    className="comanda-checkout-button"
                    disabled={
                      selectedComanda.status !== 'OPEN' ||
                      selectedComanda.items.length === 0 ||
                      payments.length === 0 ||
                      paymentSummary.remaining > 0
                    }
                  >
                    <DollarSign size={18} />
                    Fechar e Pagar
                  </button>
                </div>
              </div>

              {selectedComanda.status === 'CLOSED' && (
                <div className="comanda-actions">
                  <Button
                    variant="secondary"
                    onClick={() => handleReopenComanda()}
                    style={{ width: '100%' }}
                  >
                    Reabrir Comanda
                  </Button>
                </div>
              )}

              <button
                onClick={handleCancelComanda}
                className="comanda-cancel-btn"
              >
                Cancelar Comanda
              </button>
            </Card>
          </div>
        )}
      </div>

      {/* Open Comanda Modal */}
      <Modal
        isOpen={isOpenComandaModalOpen}
        title="Nova Comanda"
        onClose={() => setIsOpenComandaModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsOpenComandaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleOpenComanda}>
              Abrir Comanda
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenComanda}>
          <div className="form-group">
            <label htmlFor="tableNumber">Número da Mesa (opcional)</label>
            <Input
              id="tableNumber"
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ex: 1"
              min="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerName">Nome do Cliente (opcional)</label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        title="Adicionar Item"
        onClose={() => {
          setIsAddItemModalOpen(false);
          setProductSearchTerm('');
          setSelectedProduct('');
        }}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddItemModalOpen(false);
                setProductSearchTerm('');
                setSelectedProduct('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleAddItem}>
              Adicionar
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddItem}>
          <div className="form-group">
            <label htmlFor="productSearch">Buscar Produto (nome, código ou descrição)</label>
            <Input
              id="productSearch"
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="Digite para buscar..."
              required
            />
          </div>

          {productSearchTerm && (
            <div className="product-search-results">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`product-search-item ${selectedProduct === p.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedProduct(p.id);
                      setProductSearchTerm(p.name);
                    }}
                  >
                    <div className="product-search-item-name">
                      {p.code && <span className="product-code">[{p.code}]</span>}
                      <span>{p.name}</span>
                    </div>
                    <div className="product-search-item-price">
                      R$ {p.price.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="product-search-empty">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          )}

          {selectedProduct && !productSearchTerm && (
            <div className="selected-product-info">
              <p>Produto selecionado: <strong>{products.find(p => p.id === selectedProduct)?.name}</strong></p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="quantity">Quantidade</label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="observation">Observação (opcional)</label>
            <Input
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Sem chocolate, coberto"
            />
          </div>
        </form>
      </Modal>

      {/* Modal de Cadastro de Cliente */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        title="Novo Cliente"
        onClose={() => setIsNewCustomerModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsNewCustomerModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCustomer}
            >
              Cadastrar e Vincular
            </Button>
          </div>
        }
      >
        <form className="comanda-customer-form" onSubmit={handleCreateCustomer}>
          <div className="form-section">
            <h3 className="form-section-title">Dados Pessoais</h3>
            <div className="form-grid">
              <Input
                label="Nome *"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
              <Input
                label="Telefone"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
              <Input
                label="WhatsApp"
                value={customerForm.whatsapp}
                onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
              />
              <Input
                label="CPF"
                value={customerForm.cpf}
                onChange={(e) => setCustomerForm({ ...customerForm, cpf: e.target.value })}
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Endereço (Opcional)</h3>
            <div className="form-grid">
              <Input
                label="CEP"
                value={customerForm.zipCode}
                onChange={(e) => setCustomerForm({ ...customerForm, zipCode: e.target.value })}
              />
              <Input
                label="Rua"
                value={customerForm.street}
                onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })}
              />
              <Input
                label="Número"
                value={customerForm.number}
                onChange={(e) => setCustomerForm({ ...customerForm, number: e.target.value })}
              />
              <Input
                label="Bairro"
                value={customerForm.neighborhood}
                onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })}
              />
              <Input
                label="Cidade"
                value={customerForm.city}
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
              />
              <Input
                label="Estado"
                value={customerForm.state}
                onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                maxLength={2}
                placeholder="UF"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComandasPage;
