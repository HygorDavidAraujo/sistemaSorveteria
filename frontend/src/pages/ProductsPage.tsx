import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Input, Select, Modal, Loading, Alert } from '@/components/common';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import type { Product } from '@/types';

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
      const data = await apiClient.getProducts();
      setProducts(data);
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
    setForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      available: product.available,
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
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loading message="Carregando produtos..." />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark flex items-center gap-2">
          <Package size={32} />
          Gerenciar Produtos
        </h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', description: '', price: '', category: '', available: true });
            setIsFormModalOpen(true);
          }}
        >
          <Plus size={18} className="mr-2 inline" />
          Novo Produto
        </Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card className="mb-6">
        <Input
          label="Buscar Produtos"
          type="text"
          placeholder="Nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition">
            <div className="mb-4">
              <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center text-4xl mb-3">
                🍦
              </div>
              <h3 className="text-lg font-bold">{product.name}</h3>
              <p className="text-gray-600 text-sm mt-2">{product.description}</p>
            </div>

            <div className="mb-4 pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Preço:</span>
                <span className="font-bold text-primary">R$ {product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Categoria:</span>
                <span className="capitalize">{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={product.available ? 'text-success font-bold' : 'text-danger font-bold'}>
                  {product.available ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEdit(product)}
                className="flex-1"
              >
                <Edit size={16} className="mr-1 inline" />
                Editar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
        </Card>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        onClose={() => setIsFormModalOpen(false)}
        footer={
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="flex-1"
            >
              {editingId ? 'Atualizar' : 'Criar'} Produto
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Input
            label="Nome do Produto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Preço"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <Select
            label="Categoria"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              { value: 'sorvete', label: 'Sorvete' },
              { value: 'bebida', label: 'Bebida' },
              { value: 'sobremesa', label: 'Sobremesa' },
              { value: 'outro', label: 'Outro' },
            ]}
            required
          />
          <div>
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              Disponível para venda
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
