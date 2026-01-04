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
      ['Total de Vendas', `R$ ${(report.totalSales || 0).toFixed(2)}`],
      [''],
      ['FORMAS DE PAGAMENTO'],
      ['Dinheiro', `R$ ${(report.totalCash || 0).toFixed(2)}`],
      ['Cartão Crédito', `R$ ${(report.totalCard || 0).toFixed(2)}`],
      ['PIX', `R$ ${(report.totalPix || 0).toFixed(2)}`],
      [''],
      ['DESCONTOS E PROMOÇÕES'],
      ['Descontos Aplicados', `R$ ${(report.discountsApplied || 0).toFixed(2)}`],
      ['Pontos Lealdade Resgatados', `R$ ${(report.loyaltyRedeemed || 0).toFixed(2)}`],
      ['Cashback Resgatado', `R$ ${(report.cashbackRedeemed || 0).toFixed(2)}`],
      [''],
      ['RESULTADO LÍQUIDO'],
      ['Receita Líquida', `R$ ${(report.netRevenue || 0).toFixed(2)}`],
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 text-dark">
        <BarChart3 size={32} />
        <h1 className="text-3xl font-bold leading-tight">Relatórios Financeiros</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

      {/* Report Options */}
      <Card className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div>
            <label className="font-semibold text-sm block mb-2">Tipo de Relatório</label>
            <select
              title="Selecione o tipo de relatório"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as any);
                setReport(null);
              }}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="daily">Diário</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>

          {/* Date/Month Selection */}
          {reportType === 'daily' ? (
            <div>
              <label className="font-semibold text-sm block mb-2">Data</label>
              <input
                type="date"
                title="Selecione a data do relatório"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-sm block mb-2">Período</label>
              <input
                type="text"
                placeholder="MM/AAAA"
                title="Digite o período (MM/AAAA)"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              isLoading={loading}
              className="w-full"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Main Metrics */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-primary to-secondary text-white">
                <p className="text-sm opacity-90">Período</p>
                <p className="text-2xl font-bold mt-2">{report.period}</p>
              </Card>

              <Card className="bg-gradient-to-br from-success to-primary text-white">
                <p className="text-sm opacity-90">Total de Vendas</p>
                <p className="text-3xl font-bold mt-2">R$ {(report.totalSales || 0).toFixed(2)}</p>
              </Card>

              <Card className="bg-gradient-to-br from-warning to-accent text-white">
                <p className="text-sm opacity-90">Receita Líquida</p>
                <p className="text-3xl font-bold mt-2">R$ {(report.netRevenue || 0).toFixed(2)}</p>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <h3 className="text-xl font-bold mb-4">Formas de Pagamento</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">Dinheiro</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {(report.totalCash || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">Cartão Crédito</span>
                  <span className="text-xl font-bold text-secondary">
                    R$ {(report.totalCard || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">PIX</span>
                  <span className="text-xl font-bold text-success">
                    R$ {(report.totalPix || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Percentages */}
              <div className="mt-6 space-y-2 text-sm">
                <p className="text-gray-600">
                  Dinheiro: {((report.totalCash || 0) / (report.totalSales || 1) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">
                  Cartão: {((report.totalCard || 0) / (report.totalSales || 1) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">
                  PIX: {((report.totalPix || 0) / (report.totalSales || 1) * 100).toFixed(1)}%
                </p>
              </div>
            </Card>
          </div>

          {/* Discounts and Promotions */}
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-6">Descontos e Promoções</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-light rounded-lg">
                <p className="text-sm text-gray-600">Descontos Aplicados</p>
                <p className="text-2xl font-bold text-danger mt-2">
                  -R$ {(report.discountsApplied || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-light rounded-lg">
                <p className="text-sm text-gray-600">Pontos Lealdade Resgatados</p>
                <p className="text-2xl font-bold text-secondary mt-2">
                  -R$ {(report.loyaltyRedeemed || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-light rounded-lg">
                <p className="text-sm text-gray-600">Cashback Resgatado</p>
                <p className="text-2xl font-bold text-warning mt-2">
                  -R$ {(report.cashbackRedeemed || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary text-white rounded-lg">
              <p className="text-sm opacity-90">Total de Abatimentos</p>
              <p className="text-2xl font-bold">
                -R${' '}
                {(
                  (report.discountsApplied || 0) +
                  (report.loyaltyRedeemed || 0) +
                  (report.cashbackRedeemed || 0)
                ).toFixed(2)}
              </p>
            </div>
          </Card>

          {/* Download Button */}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={downloadReport}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              Baixar Relatório (CSV)
            </Button>
          </div>
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">Clique em "Gerar Relatório" para visualizar os dados</p>
        </Card>
      )}
    </div>
  );
};
