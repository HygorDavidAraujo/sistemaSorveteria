import React, { useEffect, useState } from 'react';
import { useSalesStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Modal, Loading, Alert, Badge } from '@/components/common';
import { Trash2, ShoppingCart } from 'lucide-react';
import type { Product, Customer } from '@/types';

export const SalesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountValue, setDiscountValue] = useState(0);

  const salesStore = useSalesStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, customersData] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getCustomers(),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (product: Product) => {
    salesStore.addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    salesStore.removeItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    salesStore.updateItem(itemId, quantity);
  };

  const calculateTotal = () => {
    const subtotal = salesStore.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = subtotal - discountValue;
    salesStore.setTotal(total);
    return { subtotal, total };
  };

  const handleApplyCoupon = async () => {
    try {
      const coupon = await apiClient.validateCoupon(discountCode);
      const subtotal = salesStore.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const discount =
        coupon.discountType === 'percentage'
          ? (subtotal * coupon.discountValue) / 100
          : coupon.discountValue;
      setDiscountValue(discount);
      setSuccess(`Cupom aplicado! Desconto: R$ ${discount.toFixed(2)}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Cupom inválido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCheckout = async () => {
    if (salesStore.items.length === 0) {
      setError('Adicione itens antes de finalizar');
      return;
    }

    try {
      const { subtotal, total } = calculateTotal();
      const saleData = {
        customerId: selectedCustomer || undefined,
        items: salesStore.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        subtotal,
        discountAmount: discountValue,
        totalAmount: total,
        paymentMethod,
      };

      await apiClient.createSale(saleData);
      setSuccess('Venda realizada com sucesso!');
      salesStore.clear();
      setSelectedCustomer('');
      setDiscountCode('');
      setDiscountValue(0);
      setIsCheckoutModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao finalizar venda');
    }
  };

  if (loading) return <Loading message="Carregando produtos..." />;

  const { subtotal, total } = calculateTotal();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-dark mb-8 flex items-center gap-2">
        <ShoppingCart size={32} />
        Sistema de Vendas
      </h1>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border-2 border-light rounded-lg p-4 hover:border-primary transition cursor-pointer"
                  onClick={() => handleAddItem(product)}
                >
                  <div className="mb-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center text-3xl">
                        🍦
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-primary font-bold mt-2">R$ {product.price.toFixed(2)}</p>
                  <Badge variant={product.available ? 'success' : 'danger'} className="text-xs mt-2">
                    {product.available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 bg-gradient-to-b from-light to-white">
            <h2 className="text-xl font-bold mb-4">Carrinho</h2>

            {/* Items */}
            <div className="max-h-96 overflow-y-auto mb-4 space-y-2">
              {salesStore.items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum item selecionado</p>
              ) : (
                salesStore.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start p-2 bg-white rounded border-l-4 border-primary"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.productName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                          className="w-12 px-2 py-1 border rounded text-xs"
                        />
                        <span className="text-xs text-gray-600">
                          R$ {(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-danger hover:bg-danger hover:bg-opacity-10 p-2 rounded"
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
                <div className="mb-4 space-y-3 border-t pt-4">
                  <div>
                    <label className="font-semibold text-sm block mb-2">Cliente (Opcional)</label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-2 py-2 border rounded text-sm"
                    >
                      <option value="">Consumidor Final</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.cpf})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-sm block mb-2">Cupom</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Código do cupom"
                        className="flex-1 px-2 py-2 border rounded text-sm"
                      />
                      <Button size="sm" onClick={handleApplyCoupon}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 border-t pt-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm text-danger">
                      <span>Desconto:</span>
                      <span>-R$ {discountValue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="font-semibold text-sm block mb-2">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2 py-2 border rounded text-sm"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão Crédito</option>
                    <option value="debit_card">Cartão Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <Button
                  variant="success"
                  className="w-full"
                  onClick={() => setIsCheckoutModalOpen(true)}
                >
                  Finalizar Venda
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        title="Confirmar Venda"
        onClose={() => setIsCheckoutModalOpen(false)}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setIsCheckoutModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleCheckout}
              className="flex-1"
            >
              Confirmar Venda
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-danger">
              <span>Desconto:</span>
              <span>-R$ {discountValue.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>Total a Pagar:</span>
            <span className="text-primary">R$ {total.toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-600">
            Forma de Pagamento: <strong>{paymentMethod === 'cash' ? 'Dinheiro' : paymentMethod === 'credit_card' ? 'Cartão Crédito' : paymentMethod === 'debit_card' ? 'Cartão Débito' : 'PIX'}</strong>
          </p>
        </div>
      </Modal>
    </div>
  );
};
