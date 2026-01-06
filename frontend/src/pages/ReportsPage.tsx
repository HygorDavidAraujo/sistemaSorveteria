import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Loading, Alert } from '@/components/common';
import { BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';
import './ReportsPage.css';

interface ReportData {
  period: string;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalPix: number;
  discountsApplied: number;
  loyaltyRedeemed: number;
  cashbackRedeemed: number;
  netRevenue: number;
}

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      if (reportType === 'daily') {
        const response = await apiClient.getDailyReport(selectedDate);
        // Extract data from response structure
        // The response might be { data: [...], total, limit, offset } OR { period, totalSales, ... }
        // If it has a 'data' property that is an array, it's transaction data, not a report
        if (response.data && Array.isArray(response.data)) {
          // It's transaction data, generate a report from it
          data = {
            period: selectedDate,
            totalSales: 0,
            totalCash: 0,
            totalCard: 0,
            totalPix: 0,
            discountsApplied: 0,
            loyaltyRedeemed: 0,
            cashbackRedeemed: 0,
            netRevenue: 0,
          };
        } else {
          data = response.data || response;
        }
      } else {
        const [year, month] = selectedMonth.split('-');
        const response = await apiClient.getMonthlyReport(parseInt(month), parseInt(year));
        // Extract data from response structure
        if (response.data && Array.isArray(response.data)) {
          // It's transaction data, generate a report from it
          data = {
            period: selectedMonth,
            totalSales: 0,
            totalCash: 0,
            totalCard: 0,
            totalPix: 0,
            discountsApplied: 0,
            loyaltyRedeemed: 0,
            cashbackRedeemed: 0,
            netRevenue: 0,
          };
        } else {
          data = response.data || response;
        }
      }

      setReport(data);
    } catch (err) {
      setError('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    await loadReport();
  };

  const downloadReport = () => {
    if (!report) return;

    const csv = [
      ['RELATÓRIO FINANCEIRO'],
      ['Período:', report.period],
      [''],
      ['RESUMO DE VENDAS'],
      ['Total de Vendas', `R$ ${Number(report.totalSales || 0).toFixed(2)}`],
      [''],
      ['FORMAS DE PAGAMENTO'],
      ['Dinheiro', `R$ ${Number(report.totalCash || 0).toFixed(2)}`],
      ['Cartão Crédito', `R$ ${Number(report.totalCard || 0).toFixed(2)}`],
      ['PIX', `R$ ${Number(report.totalPix || 0).toFixed(2)}`],
      [''],
      ['DESCONTOS E PROMOÇÕES'],
      ['Descontos Aplicados', `R$ ${Number(report.discountsApplied || 0).toFixed(2)}`],
      ['Pontos Lealdade Resgatados', `R$ ${Number(report.loyaltyRedeemed || 0).toFixed(2)}`],
      ['Cashback Resgatado', `R$ ${Number(report.cashbackRedeemed || 0).toFixed(2)}`],
      [''],
      ['RESULTADO LÍQUIDO'],
      ['Receita Líquida', `R$ ${Number(report.netRevenue || 0).toFixed(2)}`],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `relatorio-${report.period}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <BarChart3 size={32} />
        <h1>Relatórios Financeiros</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

      {/* Report Options */}
      <Card>
        <div className="reports-options-grid">
          {/* Report Type Selection */}
          <div>
            <label className="reports-label">Tipo de Relatório</label>
            <select
              title="Selecione o tipo de relatório"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as any);
                setReport(null);
              }}
              className="reports-select"
            >
              <option value="daily">Diário</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          {/* Date/Month Selection */}
          {reportType === 'daily' ? (
            <div>
              <label className="reports-label">Data</label>
              <input
                type="date"
                title="Selecione a data do relatório"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="reports-input"
              />
            </div>
          ) : (
            <div>
              <label className="reports-label">Período</label>
              <input
                type="text"
                placeholder="MM/AAAA"
                title="Digite o período (MM/AAAA)"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="reports-input"
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="reports-button-wrapper">
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              isLoading={loading}
            >
              Gerar Relatório
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {loading ? (
        <Loading message="Gerando relatório..." />
      ) : report ? (
        <>
          <div className="reports-grid">
            {/* Main Metrics */}
            <div className="reports-metrics">
              <Card>
                <div className="reports-metric-card reports-metric-period">
                  <p className="reports-metric-label">Período</p>
                  <p className="reports-metric-value">{report.period}</p>
                </div>
              </Card>

              <Card>
                <div className="reports-metric-card reports-metric-sales">
                  <p className="reports-metric-label">Total de Vendas</p>
                  <p className="reports-metric-value reports-metric-value-large">R$ {Number(report.totalSales || 0).toFixed(2)}</p>
                </div>
              </Card>

              <Card>
                <div className="reports-metric-card reports-metric-revenue">
                  <p className="reports-metric-label">Receita Líquida</p>
                  <p className="reports-metric-value reports-metric-value-large">R$ {Number(report.netRevenue || 0).toFixed(2)}</p>
                </div>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <h3 className="reports-section-title">Formas de Pagamento</h3>
              <div className="reports-payment-methods">
                <div className="reports-payment-item">
                  <span className="reports-payment-name">Dinheiro</span>
                  <span className="reports-payment-value reports-payment-cash">
                    R$ {Number(report.totalCash || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-payment-item">
                  <span className="reports-payment-name">Cartão Crédito</span>
                  <span className="reports-payment-value reports-payment-card">
                    R$ {Number(report.totalCard || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-payment-item">
                  <span className="reports-payment-name">PIX</span>
                  <span className="reports-payment-value reports-payment-pix">
                    R$ {Number(report.totalPix || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Percentages */}
              <div className="reports-percentages">
                <p className="reports-percentage">
                  Dinheiro: {(Number(report.totalCash || 0) / Number(report.totalSales || 1) * 100).toFixed(1)}%
                </p>
                <p className="reports-percentage">
                  Cartão: {(Number(report.totalCard || 0) / Number(report.totalSales || 1) * 100).toFixed(1)}%
                </p>
                <p className="reports-percentage">
                  PIX: {(Number(report.totalPix || 0) / Number(report.totalSales || 1) * 100).toFixed(1)}%
                </p>
              </div>
            </Card>
          </div>

          {/* Discounts and Promotions */}
          <Card>
            <h3 className="reports-section-title">Descontos e Promoções</h3>
            <div className="reports-discounts-grid">
              <div className="reports-discount-item">
                <p className="reports-discount-label">Descontos Aplicados</p>
                <p className="reports-discount-value reports-discount-danger">
                  -R$ {Number(report.discountsApplied || 0).toFixed(2)}
                </p>
              </div>
              <div className="reports-discount-item">
                <p className="reports-discount-label">Pontos Lealdade Resgatados</p>
                <p className="reports-discount-value reports-discount-secondary">
                  -R$ {Number(report.loyaltyRedeemed || 0).toFixed(2)}
                </p>
              </div>
              <div className="reports-discount-item">
                <p className="reports-discount-label">Cashback Resgatado</p>
                <p className="reports-discount-value reports-discount-warning">
                  -R$ {Number(report.cashbackRedeemed || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="reports-total-deductions">
              <p className="reports-total-label">Total de Abatimentos</p>
              <p className="reports-total-value">
                -R${' '}
                {(
                  Number(report.discountsApplied || 0) +
                  Number(report.loyaltyRedeemed || 0) +
                  Number(report.cashbackRedeemed || 0)
                ).toFixed(2)}
              </p>
            </div>
          </Card>

          {/* Download Button */}
          <div className="reports-download">
            <Button
              variant="secondary"
              onClick={downloadReport}
            >
              <Download size={18} />
              Baixar Relatório (CSV)
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <div className="reports-empty">
            <p>Clique em "Gerar Relatório" para visualizar os dados</p>
          </div>
        </Card>
      )}
    </div>
  );
};
