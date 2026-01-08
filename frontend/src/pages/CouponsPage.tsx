import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { Plus, Edit2, Trash2, Copy, Check, X, Calendar, Percent, Tag } from 'lucide-react';
import { apiClient } from '@/services/api';
import './CouponsPage.css';

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface CouponStatistics {
  totalCoupons: number;
  activeCoupons: number;
  totalUsed: number;
  averageDiscount: number;
}

export const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [statistics, setStatistics] = useState<CouponStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponsRes, statsRes] = await Promise.all([
        apiClient.get('/coupons'),
        apiClient.get('/coupons/statistics').catch(() => ({ data: null })),
      ]);

      // Extract data from response: { status: 'success', data: [...] }
      setCoupons(Array.isArray(couponsRes.data) ? couponsRes.data : (couponsRes.data?.data || []));
      setStatistics(statsRes.data?.data || statsRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMinPurchaseAmount('');
    setMaxDiscountAmount('');
    setStartDate('');
    setEndDate('');
    setUsageLimit('');
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !discountValue || !startDate || !endDate) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await apiClient.post('/coupons', {
        code: code.toUpperCase(),
        description: description || undefined,
        couponType: discountType.toLowerCase(), // Backend espera 'percentage' ou 'fixed'
        discountValue: parseFloat(discountValue),
        minPurchaseValue: minPurchaseAmount ? parseFloat(minPurchaseAmount) : undefined, // Backend espera minPurchaseValue
        maxDiscount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined, // Backend espera maxDiscount
        validFrom: new Date(startDate).toISOString(), // Backend espera validFrom
        validTo: new Date(endDate).toISOString(), // Backend espera validTo
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
      });

      setCoupons([...coupons, response.data || response]);
      setSuccess('Cupom criado com sucesso!');
      setIsCreateModalOpen(false);
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar cupom');
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;

    try {
      const response = await apiClient.put(`/coupons/${selectedCoupon.id}`, {
        description: description || undefined,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : undefined,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        usageLimit: usageLimit ? parseInt(usageLimit) : undefined,
      });

      const updatedCoupon = response.data || response;
      setCoupons(coupons.map((c) => (c.id === selectedCoupon.id ? updatedCoupon : c)));
      setSuccess('Cupom atualizado com sucesso!');
      setIsEditModalOpen(false);
      resetForm();
      setSelectedCoupon(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar cupom');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      let response;
      if (coupon.isActive) {
        response = await apiClient.post(`/coupons/${coupon.id}/deactivate`);
      } else {
        response = await apiClient.post(`/coupons/${coupon.id}/activate`);
      }

      const updatedCoupon = response.data || response;
      setCoupons(coupons.map((c) => (c.id === coupon.id ? updatedCoupon : c)));
      setSuccess(coupon.isActive ? 'Cupom desativado!' : 'Cupom ativado!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar cupom');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este cupom?')) return;

    try {
      await apiClient.delete(`/coupons/${couponId}`);
      setCoupons(coupons.filter((c) => c.id !== couponId));
      setSuccess('Cupom deletado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar cupom');
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || '');
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue.toString());
    setMinPurchaseAmount(coupon.minPurchaseAmount?.toString() || '');
    setMaxDiscountAmount(coupon.maxDiscountAmount?.toString() || '');
    setStartDate(coupon.startDate.split('T')[0]);
    setEndDate(coupon.endDate.split('T')[0]);
    setUsageLimit(coupon.usageLimit?.toString() || '');
    setIsEditModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess('Código copiado!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const filteredCoupons = coupons.filter((c) => {
    if (filter === 'active') return c.isActive;
    if (filter === 'inactive') return !c.isActive;
    return true;
  });

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%`;
    }
    return `R$ ${coupon.discountValue.toFixed(2)}`;
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();

  if (loading) return <Loading message="Carregando cupons..." />;

  return (
    <div className="coupons-page">
      <div className="page-header">
        <Tag size={32} />
        <h1>Gerenciar Cupons</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Statistics */}
      {statistics && (
        <div className="coupons-stats-grid">
          <Card>
            <div className="stat-item">
              <p className="stat-label">Total de Cupons</p>
              <p className="stat-value">{statistics.totalCoupons}</p>
            </div>
          </Card>

          <Card>
            <div className="stat-item">
              <p className="stat-label">Cupons Ativos</p>
              <p className="stat-value stat-active">{statistics.activeCoupons}</p>
            </div>
          </Card>

          <Card>
            <div className="stat-item">
              <p className="stat-label">Total Utilizado</p>
              <p className="stat-value">{statistics.totalUsed}</p>
            </div>
          </Card>

          <Card>
            <div className="stat-item">
              <p className="stat-label">Desconto Médio</p>
              <p className="stat-value stat-discount">
                R$ {statistics.averageDiscount.toFixed(2)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="coupons-controls">
        <div className="coupons-filter">
          <label>Filtrar:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">Todos ({coupons.length})</option>
            <option value="active">Ativos ({coupons.filter((c) => c.isActive).length})</option>
            <option value="inactive">Inativos ({coupons.filter((c) => !c.isActive).length})</option>
          </select>
        </div>

        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          Novo Cupom
        </Button>
      </div>

      {/* Coupons Table */}
      <Card>
        <div className="coupons-table-wrapper">
          <table className="coupons-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Desconto</th>
                <th>Compra Mínima</th>
                <th>Uso</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className={`coupon-row ${isExpired(coupon.endDate) ? 'expired' : ''}`}>
                    <td className="coupon-code">
                      <div className="code-cell">
                        <strong>{coupon.code}</strong>
                        <button
                          className="copy-btn"
                          onClick={() => handleCopyCode(coupon.code)}
                          title="Copiar código"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td>{coupon.description || '-'}</td>
                    <td>
                      <span className="discount-badge">
                        {formatDiscount(coupon)}
                      </span>
                    </td>
                    <td>
                      {coupon.minPurchaseAmount
                        ? `R$ ${coupon.minPurchaseAmount.toFixed(2)}`
                        : '-'}
                    </td>
                    <td>
                      <span className="usage-info">
                        {coupon.usageCount}
                        {coupon.usageLimit && `/${coupon.usageLimit}`}
                      </span>
                    </td>
                    <td>
                      <span className={`date-info ${isExpired(coupon.endDate) ? 'expired-text' : ''}`}>
                        {new Date(coupon.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                        {coupon.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEditCoupon(coupon)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          className={`action-btn ${coupon.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleCoupon(coupon)}
                          title={coupon.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.isActive ? <X size={16} /> : <Check size={16} />}
                        </button>

                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-message">
                    Nenhum cupom encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Coupon Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        title="Criar Novo Cupom"
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateCoupon}>
              Criar Cupom
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCoupon} className="coupon-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="code">Código do Cupom *</label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: PROMO2024"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="discountType">Tipo de Desconto *</label>
              <select
                id="discountType"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="form-input"
              >
                <option value="PERCENTAGE">Porcentagem (%)</option>
                <option value="FIXED">Valor Fixo (R$)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discountValue">
                Valor do Desconto {discountType === 'PERCENTAGE' ? '(%)' : '(R$)'} *
              </label>
              <Input
                id="discountValue"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="10"
                step={discountType === 'PERCENTAGE' ? '0.1' : '0.01'}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxDiscountAmount">Desconto Máximo (R$) (opcional)</label>
              <Input
                id="maxDiscountAmount"
                type="number"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="100.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição (opcional)</label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Cupom para clientes VIP"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="minPurchaseAmount">Compra Mínima (R$) (opcional)</label>
              <Input
                id="minPurchaseAmount"
                type="number"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                placeholder="50.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="usageLimit">Limite de Usos (opcional)</label>
              <Input
                id="usageLimit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="100"
                min="1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Data de Início *</label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">Data de Término *</label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Coupon Modal */}
      <Modal
        isOpen={isEditModalOpen}
        title={`Editar Cupom ${selectedCoupon?.code}`}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
          setSelectedCoupon(null);
        }}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
                setSelectedCoupon(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleUpdateCoupon}>
              Atualizar
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUpdateCoupon} className="coupon-form">
          <div className="form-group">
            <label>Código (não editável)</label>
            <Input value={code} disabled />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="discountType">Tipo de Desconto</label>
              <select
                id="discountType"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="form-input"
              >
                <option value="PERCENTAGE">Porcentagem (%)</option>
                <option value="FIXED">Valor Fixo (R$)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discountValue">Valor do Desconto</label>
              <Input
                id="discountValue"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                step={discountType === 'PERCENTAGE' ? '0.1' : '0.01'}
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="minPurchaseAmount">Compra Mínima (R$)</label>
              <Input
                id="minPurchaseAmount"
                type="number"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxDiscountAmount">Desconto Máximo (R$)</label>
              <Input
                id="maxDiscountAmount"
                type="number"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição</label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Data de Início</label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">Data de Término</label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="usageLimit">Limite de Usos</label>
            <Input
              id="usageLimit"
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              min="1"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
