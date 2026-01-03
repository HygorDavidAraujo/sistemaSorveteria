import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Loading, Alert } from '@/components/common';
import { BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';

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
        data = await apiClient.getDailyReport(selectedDate);
      } else {
        const [year, month] = selectedMonth.split('-');
        data = await apiClient.getMonthlyReport(parseInt(month), parseInt(year));
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
      ['Total de Vendas', `R$ ${report.totalSales.toFixed(2)}`],
      [''],
      ['FORMAS DE PAGAMENTO'],
      ['Dinheiro', `R$ ${report.totalCash.toFixed(2)}`],
      ['Cartão Crédito', `R$ ${report.totalCard.toFixed(2)}`],
      ['PIX', `R$ ${report.totalPix.toFixed(2)}`],
      [''],
      ['DESCONTOS E PROMOÇÕES'],
      ['Descontos Aplicados', `R$ ${report.discountsApplied.toFixed(2)}`],
      ['Pontos Lealdade Resgatados', `R$ ${report.loyaltyRedeemed.toFixed(2)}`],
      ['Cashback Resgatado', `R$ ${report.cashbackRedeemed.toFixed(2)}`],
      [''],
      ['RESULTADO LÍQUIDO'],
      ['Receita Líquida', `R$ ${report.netRevenue.toFixed(2)}`],
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-dark mb-8 flex items-center gap-2">
        <BarChart3 size={32} />
        Relatórios Financeiros
      </h1>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

      {/* Report Options */}
      <Card className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div>
            <label className="font-semibold text-sm block mb-2">Tipo de Relatório</label>
            <select
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
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-sm block mb-2">Período</label>
              <input
                type="month"
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
                <p className="text-3xl font-bold mt-2">R$ {report.totalSales.toFixed(2)}</p>
              </Card>

              <Card className="bg-gradient-to-br from-warning to-accent text-white">
                <p className="text-sm opacity-90">Receita Líquida</p>
                <p className="text-3xl font-bold mt-2">R$ {report.netRevenue.toFixed(2)}</p>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <h3 className="text-xl font-bold mb-4">Formas de Pagamento</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">Dinheiro</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {report.totalCash.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">Cartão Crédito</span>
                  <span className="text-xl font-bold text-secondary">
                    R$ {report.totalCard.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-light rounded-lg">
                  <span className="font-semibold">PIX</span>
                  <span className="text-xl font-bold text-success">
                    R$ {report.totalPix.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Percentages */}
              <div className="mt-6 space-y-2 text-sm">
                <p className="text-gray-600">
                  Dinheiro: {((report.totalCash / report.totalSales) * 100).toFixed(1)}%
                </p>
                <p className="text-gray-600">
                  Cartão: {((report.totalCard / report.totalSales) * 100).toFixed(1)}%
                </p>
                <p className="text-gray-600">
                  PIX: {((report.totalPix / report.totalSales) * 100).toFixed(1)}%
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
                  -R$ {report.discountsApplied.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-light rounded-lg">
                <p className="text-sm text-gray-600">Pontos Lealdade Resgatados</p>
                <p className="text-2xl font-bold text-secondary mt-2">
                  -R$ {report.loyaltyRedeemed.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-light rounded-lg">
                <p className="text-sm text-gray-600">Cashback Resgatado</p>
                <p className="text-2xl font-bold text-warning mt-2">
                  -R$ {report.cashbackRedeemed.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary text-white rounded-lg">
              <p className="text-sm opacity-90">Total de Abatimentos</p>
              <p className="text-2xl font-bold">
                -R${' '}
                {(
                  report.discountsApplied +
                  report.loyaltyRedeemed +
                  report.cashbackRedeemed
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
