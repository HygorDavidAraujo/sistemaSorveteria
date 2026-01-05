import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { Plus, Edit2, Trash2, X, ShoppingCart, Check, DollarSign } from 'lucide-react';
import { apiClient } from '@/services/api';
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
  price: number;
  category: string;
}

const normalizeProduct = (product: any): Product => ({
  id: product?.id || '',
  name: product?.name || '',
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
  status: comanda?.status || 'OPEN',
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
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [discount, setDiscount] = useState('0');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

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
    try {
      const response = await apiClient.post('/comandas', {
        tableNumber: tableNumber ? parseInt(tableNumber) : undefined,
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

    try {
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
        productId: selectedProduct,
        quantity: parseInt(quantity),
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

  const handleCloseComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda) return;

    try {
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/close`, {
        discount: parseFloat(discount),
      });

      const comandaData = normalizeComanda(response.data?.data || response.data);
      setComandas(comandas.map((c) => (c.id === selectedComanda.id ? comandaData : c)));
      setSelectedComanda(comandaData);
      setSuccess('Comanda fechada com sucesso!');
      setIsCloseComandaModalOpen(false);
      setDiscount('0');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fechar comanda');
    }
  };

  const handleReopenComanda = async () => {
    if (!selectedComanda) return;

    try {
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/reopen`);
      const comandaData = normalizeComanda(response.data?.data || response.data);
      setComandas(comandas.map((c) => (c.id === selectedComanda.id ? comandaData : c)));
      setSelectedComanda(comandaData);
      setSuccess('Comanda reabierta com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reabrir comanda');
    }
  };

  const handleCancelComanda = async () => {
    if (!selectedComanda) return;

    if (!window.confirm('Tem certeza que deseja cancelar esta comanda?')) return;

    try {
      await apiClient.post(`/comandas/${selectedComanda.id}/cancel`);
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
        onClose={() => setIsAddItemModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsAddItemModalOpen(false)}
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
            <label htmlFor="product">Produto</label>
            <select
              id="product"
              value={selectedProduct}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}
              required
              className="form-input"
            >
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - R$ {p.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

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
            <Button variant="success" onClick={handleCloseComanda}>
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
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};


