import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { Plus, Edit2, Trash2, X, ShoppingCart, Check, DollarSign, UserPlus, Printer } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCashSessionStore, useCustomersStore } from '@/store';
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
  const [isCloseComandaModalOpen, setIsCloseComandaModalOpen] = useState(false);

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

  // Load data
  useEffect(() => {
    loadData();
    loadSession();
    loadCustomers();
  }, [loadSession, loadCustomers]);

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
        c.tableNumber?.trim().toLowerCase() === tableNumberNormalized
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
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
        productId: selectedProduct,
        quantity: qty,
        observation: observation || undefined,
      });

      // Update selected comanda with new item
      const updatedComanda = await apiClient.get(`/comandas/${selectedComanda.id}`);
      const comandaData = normalizeComanda(updatedComanda.data?.data || updatedComanda.data);
      setSelectedComanda(comandaData);

      // Update comanda in list
      setComandas(
        comandas.map((c) => (c.id === selectedComanda.id ? comandaData : c))
      );

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

      const updatedComanda = await apiClient.get(`/comandas/${selectedComanda.id}`);
      const comandaData = normalizeComanda(updatedComanda.data?.data || updatedComanda.data);
      setSelectedComanda(comandaData);
      setComandas(
        comandas.map((c) => (c.id === selectedComanda.id ? comandaData : c))
      );

      setSuccess('Item removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover item');
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
        <td class="receipt-item-name">${item.productName}</td>
        <td class="receipt-item-qty">${item.quantity.toFixed(3)}</td>
        <td class="receipt-item-price">R$ ${item.unitPrice.toFixed(2)}</td>
        <td class="receipt-item-total">R$ ${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pré-Conta - Comanda #${selectedComanda.comandaNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              max-width: 80mm;
              margin: 0;
              padding: 10mm;
              font-size: 13px;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 10mm;
              border-bottom: 1px dashed #000;
              padding-bottom: 5mm;
            }
            .receipt-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5mm;
            }
            .receipt-info {
              font-size: 11px;
              margin: 2mm 0;
            }
            .receipt-items {
              width: 100%;
              margin: 10mm 0;
              border-collapse: collapse;
            }
            .receipt-items thead {
              border-bottom: 1px dashed #000;
            }
            .receipt-items th {
              text-align: left;
              font-weight: bold;
              font-size: 11px;
              padding: 3mm 0;
            }
            .receipt-items td {
              padding: 2mm 0;
              font-size: 12px;
            }
            .receipt-item-name {
              max-width: 30mm;
              word-break: break-word;
            }
            .receipt-item-qty {
              text-align: right;
              width: 12mm;
            }
            .receipt-item-price {
              text-align: right;
              width: 15mm;
            }
            .receipt-item-total {
              text-align: right;
              width: 18mm;
              font-weight: bold;
            }
            .receipt-totals {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5mm 0;
              margin: 5mm 0;
            }
            .receipt-total-row {
              display: flex;
              justify-content: space-between;
              margin: 2mm 0;
              font-size: 13px;
            }
            .receipt-final-total {
              font-size: 15px;
              font-weight: bold;
              margin-top: 3mm;
            }
            .receipt-footer {
              text-align: center;
              margin-top: 10mm;
              font-size: 11px;
              border-top: 1px dashed #000;
              padding-top: 5mm;
            }
            @media print {
              body { margin: 0; padding: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="receipt-title">PRÉ-CONTA</div>
            <div class="receipt-info">Comanda #${selectedComanda.comandaNumber}</div>
            ${selectedComanda.tableNumber ? `<div class="receipt-info">Mesa: ${selectedComanda.tableNumber}</div>` : ''}
            <div class="receipt-info">Data: ${dateStr}</div>
            <div class="receipt-info">Hora: ${timeStr}</div>
          </div>

          <div class="receipt-info">
            <strong>Cliente:</strong> ${customerInfo}
          </div>

          <table class="receipt-items">
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="receipt-item-qty">Qtd</th>
                <th class="receipt-item-price">Valor</th>
                <th class="receipt-item-total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="receipt-totals">
            <div class="receipt-total-row">
              <span>Subtotal:</span>
              <span>R$ ${selectedComanda.subtotal.toFixed(2)}</span>
            </div>
            ${selectedComanda.discount > 0 ? `
              <div class="receipt-total-row">
                <span>Desconto:</span>
                <span>-R$ ${selectedComanda.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="receipt-total-row receipt-final-total">
              <span>TOTAL:</span>
              <span>R$ ${selectedComanda.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="receipt-footer">
            <div style="font-weight: bold; margin-bottom: 3mm;">*** PRÉ-CONTA ***</div>
            <div>Documento não fiscal</div>
            <div style="margin-top: 3mm; font-size: 9px;">Gelatini - Gelados & Açaí</div>
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

  const handleCloseComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda) return;

    // Validate payments
    if (payments.length === 0) {
      setError('Adicione pelo menos uma forma de pagamento');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const totalToPay = selectedComanda.subtotal - parseFloat(discount || '0');
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid < totalToPay) {
      setError(`Faltam R$ ${(totalToPay - totalPaid).toFixed(2)} para pagar`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/close`, {
        discount: parseFloat(discount),
        payments: payments.map(p => ({
          paymentMethod: p.method,
          amount: p.amount
        }))
      });

      const comandaData = normalizeComanda(response.data?.data || response.data);
      setComandas(comandas.map((c) => (c.id === selectedComanda.id ? comandaData : c)));
      setSelectedComanda(comandaData);
      setSuccess('Comanda fechada com sucesso!');
      setIsCloseComandaModalOpen(false);
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

              {/* Items */}
              <div className="comanda-items-section">
                <div className="comanda-items-header">
                  <h3>Itens</h3>
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

                <div className="comanda-items-list">
                  {selectedComanda.items.length > 0 ? (
                    selectedComanda.items.map((item) => (
                      <div key={item.id} className="comanda-item-row">
                        <div className="comanda-item-info">
                          <p className="comanda-item-name">{item.productName}</p>
                          {item.observation && (
                            <p className="comanda-item-observation">{item.observation}</p>
                          )}
                          <p className="comanda-item-qty">
                            {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                          </p>
                        </div>

                        <div className="comanda-item-actions">
                          <p className="comanda-item-subtotal">
                            R$ {item.subtotal.toFixed(2)}
                          </p>
                          {selectedComanda.status === 'OPEN' && (
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="comanda-item-remove"
                              title="Remover item"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="comanda-items-empty">Nenhum item adicionado</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="comanda-summary">
                <div className="comanda-summary-row">
                  <span>Subtotal:</span>
                  <strong>R$ {selectedComanda.subtotal.toFixed(2)}</strong>
                </div>

                {selectedComanda.discount > 0 && (
                  <div className="comanda-summary-row discount">
                    <span>Desconto:</span>
                    <strong>-R$ {selectedComanda.discount.toFixed(2)}</strong>
                  </div>
                )}

                <div className="comanda-summary-row total">
                  <span>Total:</span>
                  <strong>R$ {selectedComanda.total.toFixed(2)}</strong>
                </div>
              </div>

              {/* Customer & Payment Actions */}
              {selectedComanda.status === 'OPEN' && selectedComanda.items.length > 0 && (
                <>
                  <div className="comanda-cart-section">
                    <label className="comanda-cart-section-label">Cliente (Opcional)</label>
                    <div className="comanda-customer-select-group">
                      <select
                        title="Selecione um cliente"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="comanda-cart-section-select"
                      >
                        <option value="">Consumidor Final</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} ({customer.cpf})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="comanda-new-customer-btn"
                        title="Cadastrar novo cliente"
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="comanda-cart-buttons">
                    <button
                      onClick={handlePrintPreBill}
                      className="comanda-print-preview-button"
                      title="Imprimir pré-conta"
                    >
                      <Printer size={18} />
                      Pré-Conta
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsCloseComandaModalOpen(true);
                    }}
                    className="comanda-add-payment-btn"
                    title="Adicionar forma de pagamento"
                  >
                    💳 Adicionar Pagamento
                  </button>

                  {/* Display Selected Payments */}
                  {payments.length > 0 && (
                    <div className="comanda-selected-payments">
                      <h3 className="comanda-selected-payments-title">Pagamentos Registrados:</h3>
                      {payments.map((payment, index) => (
                        <div key={index} className="comanda-selected-payment-item">
                          <span className="comanda-selected-payment-method">
                            {getPaymentMethodLabel(payment.method)}
                          </span>
                          <span className="comanda-selected-payment-amount">
                            R$ {payment.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemovePayment(index)}
                            className="comanda-selected-payment-remove"
                            title="Remover pagamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              {selectedComanda.status === 'OPEN' && (
                <div className="comanda-actions">
                  <Button
                    variant="success"
                    onClick={() => setIsCloseComandaModalOpen(true)}
                    style={{ width: '100%' }}
                  >
                    <DollarSign size={18} />
                    Fechar e Pagar
                  </Button>
                </div>
              )}

              {selectedComanda.status === 'CLOSED' && (
                <div className="comanda-actions">
                  <Button
                    variant="secondary"
                    onClick={handleReopenComanda}
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

      {/* Close Comanda Modal */}
      <Modal
        isOpen={isCloseComandaModalOpen}
        title="Fechar Comanda"
        onClose={() => setIsCloseComandaModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsCloseComandaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="success" 
              onClick={handleCloseComanda}
              disabled={payments.length === 0 || (selectedComanda ? (payments.reduce((sum, p) => sum + p.amount, 0) < (selectedComanda.subtotal - parseFloat(discount || '0'))) : true)}
            >
              <Check size={18} />
              Fechar
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCloseComanda}>
          {selectedComanda && (
            <>
              <div className="form-group">
                <label>Subtotal</label>
                <div className="form-value">R$ {selectedComanda.subtotal.toFixed(2)}</div>
              </div>

              <div className="form-group">
                <label htmlFor="discount">Desconto</label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Total a Pagar</label>
                <div className="form-value form-total">
                  R$ {(selectedComanda.subtotal - parseFloat(discount || '0')).toFixed(2)}
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="comanda-payment-section">
                <h3 className="comanda-payment-title">Formas de Pagamento</h3>
                
                <div className="comanda-payment-input-group">
                  <select
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
                    type="text"
                    placeholder="Valor"
                    value={currentPaymentAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.');
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setCurrentPaymentAmount(value);
                      }
                    }}
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

                {/* Payment Items */}
                {payments.length > 0 && (
                  <div className="comanda-payment-items">
                    {payments.map((payment, index) => (
                      <div key={index} className="comanda-payment-item">
                        <span className="comanda-payment-item-method">
                          {getPaymentMethodLabel(payment.method)}
                        </span>
                        <span className="comanda-payment-item-amount">
                          R$ {payment.amount.toFixed(2)}
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

                {/* Payment Status */}
                {(() => {
                  const totalToPay = selectedComanda.subtotal - parseFloat(discount || '0');
                  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                  const remaining = totalToPay - totalPaid;
                  const hasChange = totalPaid > totalToPay;
                  const change = hasChange ? totalPaid - totalToPay : 0;

                  return (
                    <div className="comanda-payment-status">
                      <div className="comanda-payment-status-row">
                        <span>Total Recebido:</span>
                        <span className="comanda-payment-total">R$ {totalPaid.toFixed(2)}</span>
                      </div>

                      {remaining > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--missing">
                          <span>⚠️ Faltando:</span>
                          <span className="comanda-payment-missing">R$ {remaining.toFixed(2)}</span>
                        </div>
                      )}

                      {hasChange && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--change">
                          <span>💰 Troco:</span>
                          <span className="comanda-payment-change">R$ {change.toFixed(2)}</span>
                        </div>
                      )}

                      {remaining === 0 && totalPaid > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--complete">
                          <span>✓ Pagamento Completo</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
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
