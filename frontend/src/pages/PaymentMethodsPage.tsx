import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Save } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/store';
import { Alert, Badge, Button, Card, Input, Loading } from '@/components/common';
import type { PaymentMethodConfig, PaymentMethod } from '@/types';
import './PaymentMethodsPage.css';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  debit_card: 'Cartão Débito',
  credit_card: 'Cartão Crédito',
  pix: 'PIX',
  other: 'Outros',
};

const toNumberOrEmpty = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
};

export const PaymentMethodsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin';

  const [configs, setConfigs] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPaymentMethodConfigs();
      const list = response.data || response;
      setConfigs(list);
    } catch {
      setError('Erro ao carregar formas de pagamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...configs].sort((a, b) => a.paymentMethod.localeCompare(b.paymentMethod));
  }, [configs]);

  const updateRow = (paymentMethod: PaymentMethod, patch: Partial<PaymentMethodConfig>) => {
    setConfigs((prev) =>
      prev.map((row) => (row.paymentMethod === paymentMethod ? { ...row, ...patch } : row))
    );
  };

  const handleSave = async (row: PaymentMethodConfig) => {
    try {
      setError(null);
      setSuccess(null);
      setSavingMethod(row.paymentMethod);

      await apiClient.upsertPaymentMethodConfig(row.paymentMethod, {
        feePercent: row.feePercent === '' ? 0 : Number(row.feePercent),
        settlementDays: row.settlementDays === undefined ? null : row.settlementDays,
        isActive: row.isActive,
      });

      setSuccess('Configuração atualizada com sucesso');
      setTimeout(() => setSuccess(null), 2500);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
    } finally {
      setSavingMethod(null);
    }
  };

  return (
    <div className="payment-methods-page">
      <div className="payment-methods-header">
        <div className="page-header">
          <CreditCard size={28} />
          <h1>Formas de Pagamento</h1>
        </div>
        {!canEdit && (
          <p className="payment-methods-hint">
            Você tem acesso somente de leitura. Para editar, use um usuário admin.
          </p>
        )}
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Loading message="Carregando configurações..." />
      ) : (
        <Card className="payment-methods-card">
          <div className="payment-methods-table-wrapper">
            <table className="payment-methods-table">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th>Taxa (%)</th>
                  <th>Prazo (dias)</th>
                  <th>Status</th>
                  <th className="payment-methods-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.paymentMethod}>
                    <td>
                      <div className="payment-methods-name">{METHOD_LABEL[row.paymentMethod]}</div>
                      <div className="payment-methods-code">{row.paymentMethod}</div>
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={toNumberOrEmpty(row.feePercent)}
                        onChange={(e) => updateRow(row.paymentMethod, { feePercent: e.target.value })}
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="1"
                        min={0}
                        value={row.settlementDays === null ? '' : (row.settlementDays as any) ?? ''}
                        onChange={(e) =>
                          updateRow(row.paymentMethod, {
                            settlementDays: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="Em branco = na hora"
                        disabled={!canEdit}
                      />
                    </td>
                    <td>
                      <Badge variant={row.isActive ? 'success' : 'secondary'}>
                        {row.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="payment-methods-right">
                      <div className="payment-methods-actions">
                        <Button
                          variant={row.isActive ? 'secondary' : 'success'}
                          size="sm"
                          disabled={!canEdit || savingMethod === row.paymentMethod}
                          onClick={() => updateRow(row.paymentMethod, { isActive: !row.isActive })}
                        >
                          {row.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={savingMethod === row.paymentMethod}
                          disabled={!canEdit}
                          onClick={() => handleSave(row)}
                        >
                          <Save size={16} />
                          Salvar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
