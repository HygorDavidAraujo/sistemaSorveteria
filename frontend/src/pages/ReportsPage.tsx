import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, Button, Loading, Alert } from '@/components/common';
import { BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import type {
  TransactionsSummaryReport,
  DREReport,
  CashFlowReport,
  ProfitabilityReport,
  FinancialIndicatorsReport,
  ComparativeReport,
  ProductTimeSeriesReport,
  ProductRankingReport,
  ProductABCCurveReport,
  ProductReportGranularity,
  ProductRankingMetric,
  BirthdayCustomersReport,
  SalesByModuleReport,
  SalesByPaymentMethodReport,
  CardFeesByPaymentMethodReport,
} from '@/types';
import './ReportsPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

type ReportKind =
  | 'summary'
  | 'dre'
  | 'cash-flow'
  | 'profitability'
  | 'comparative'
  | 'indicators'
  | 'products-timeseries'
  | 'products-ranking'
  | 'products-abc'
  | 'customers-birthdays'
  | 'sales-modules'
  | 'sales-payments'
  | 'card-fees';

export const ReportsPage: React.FC = () => {
  const [reportKind, setReportKind] = useState<ReportKind>('dre');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [productGranularity, setProductGranularity] = useState<ProductReportGranularity>('day');
  const [productMetric, setProductMetric] = useState<ProductRankingMetric>('revenue');
  const [productLimit, setProductLimit] = useState<number>(20);
  const [report, setReport] = useState<
    | TransactionsSummaryReport
    | DREReport
    | CashFlowReport
    | ProfitabilityReport
    | FinancialIndicatorsReport
    | ComparativeReport
    | ProductTimeSeriesReport
    | ProductRankingReport
    | ProductABCCurveReport
    | BirthdayCustomersReport
    | SalesByModuleReport
    | SalesByPaymentMethodReport
    | CardFeesByPaymentMethodReport
    | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const periodLabel = useMemo(() => {
    if (reportKind === 'indicators') return 'Indicadores (geral)';
    return `${startDate} → ${endDate}`;
  }, [reportKind, startDate, endDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

      if (reportKind !== 'indicators' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          setError('Período inválido');
          setReport(null);
          return;
        }
        if (start > end) {
          setError('Data inicial não pode ser maior que a data final');
          setReport(null);
          return;
        }
      }

      let data: any;
      switch (reportKind) {
        case 'summary':
          data = unwrap(await apiClient.getTransactionsSummary(startDate, endDate));
          break;
        case 'dre':
          data = unwrap(await apiClient.getDREReport(startDate, endDate));
          break;
        case 'cash-flow':
          data = unwrap(await apiClient.getCashFlowReport(startDate, endDate));
          break;
        case 'profitability':
          data = unwrap(await apiClient.getProfitabilityReport(startDate, endDate));
          break;
        case 'comparative':
          data = unwrap(await apiClient.getComparativeReport(startDate, endDate));
          break;
        case 'indicators':
          data = unwrap(await apiClient.getIndicatorsReport());
          break;
        case 'products-timeseries':
          data = unwrap(await apiClient.getProductTimeSeriesReport(startDate, endDate, productGranularity));
          break;
        case 'products-ranking':
          data = unwrap(await apiClient.getProductRankingReport(startDate, endDate, productMetric, productLimit));
          break;
        case 'products-abc':
          data = unwrap(await apiClient.getProductABCCurveReport(startDate, endDate));
          break;
        case 'customers-birthdays':
          data = unwrap(await apiClient.getBirthdayCustomersReport(startDate, endDate));
          break;
        case 'sales-modules':
          data = unwrap(await apiClient.getSalesByModuleReport(startDate, endDate));
          break;
        case 'sales-payments':
          data = unwrap(await apiClient.getSalesByPaymentMethodsReport(startDate, endDate));
          break;
        case 'card-fees':
          data = unwrap(await apiClient.getCardFeesByPaymentMethodReport(startDate, endDate));
          break;
        default:
          data = null;
      }

      setReport(data);
    } catch (err: any) {
      const status = err?.response?.status;
      const payload = err?.response?.data;

      const backendMessage =
        payload?.message ??
        payload?.error ??
        (typeof payload === 'string' ? payload : undefined);

      const detailsFromBackend = Array.isArray(payload?.details)
        ? payload.details
            .map((d: any) => d?.message || d?.detail || d)
            .filter(Boolean)
            .join(', ')
        : undefined;

      const composed =
        detailsFromBackend ||
        backendMessage ||
        err?.message ||
        'Erro ao carregar relatório';

      setError(status ? `${composed} (HTTP ${status})` : composed);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    await loadReport();
  };

  const downloadReport = () => {
    if (!report) return;

    const money = (value: any) => `R$ ${Number(value || 0).toFixed(2)}`;
    const pct = (value: any) => `${Number(value || 0).toFixed(2)}%`;

    const rows: string[][] = [];
    rows.push(['RELATÓRIOS FINANCEIROS']);
    rows.push(['Tipo:', reportKind]);
    rows.push(['Período:', periodLabel]);
    rows.push(['']);

    if (reportKind === 'summary') {
      const r = report as TransactionsSummaryReport;
      rows.push(['RESUMO DE TRANSAÇÕES']);
      rows.push(['Receitas', money(r.totalIncome)]);
      rows.push(['Despesas', money(r.totalExpense)]);
      rows.push(['Saldo (Receita - Despesa)', money((r.totalIncome || 0) - (r.totalExpense || 0))]);
      rows.push(['']);
      rows.push(['STATUS']);
      rows.push(['Pendentes', String(r.pending || 0)]);
      rows.push(['Pagas', String(r.paid || 0)]);
      rows.push(['Vencidas', String(r.overdue || 0)]);
    } else if (reportKind === 'dre') {
      const r = report as DREReport;
      rows.push(['DRE (DEMONSTRAÇÃO DO RESULTADO)']);
      rows.push(['Receita Bruta', money(r.grossRevenue)]);
      rows.push(['Descontos', money(r.discounts)]);
      rows.push(['Receita Líquida', money(r.netRevenue)]);
      rows.push(['CPV (COGS)', money(r.costOfGoodsSold)]);
      rows.push(['Lucro Bruto', money(r.grossProfit)]);
      rows.push(['Margem Bruta', pct(r.grossProfitMargin)]);
      rows.push(['Despesas Operacionais', money(r.operatingExpenses)]);
      rows.push(['Lucro Operacional', money(r.operatingProfit)]);
      rows.push(['Margem Operacional', pct(r.operatingMargin)]);
      rows.push(['Receitas Financeiras', money(r.financialIncome)]);
      rows.push(['Despesas Financeiras', money(r.financialExpenses)]);
      rows.push(['Resultado Financeiro', money(r.financialResult)]);
      rows.push(['Outras Receitas', money(r.otherIncome)]);
      rows.push(['Outras Despesas', money(r.otherExpenses)]);
      rows.push(['Lucro Antes de Impostos', money(r.profitBeforeTaxes)]);
      rows.push(['Impostos', money(r.taxes)]);
      rows.push(['Lucro Líquido', money(r.netProfit)]);
      rows.push(['Margem Líquida', pct(r.netMargin)]);
    } else if (reportKind === 'cash-flow') {
      const r = report as CashFlowReport;
      rows.push(['FLUXO DE CAIXA']);
      rows.push(['Saldo Inicial', money(r.initialBalance)]);
      rows.push(['']);
      rows.push(['ENTRADAS']);
      rows.push(['Vendas', money(r.inflows?.sales)]);
      rows.push(['Contas a Receber', money(r.inflows?.accountsReceivable)]);
      rows.push(['Outras Entradas', money(r.inflows?.otherIncome)]);
      rows.push(['Total Entradas', money(r.inflows?.total)]);
      rows.push(['']);
      rows.push(['SAÍDAS']);
      rows.push(['CPV (COGS)', money(r.outflows?.cogs)]);
      rows.push(['Despesas Operacionais', money(r.outflows?.operatingExpenses)]);
      rows.push(['Contas a Pagar', money(r.outflows?.accountsPayable)]);
      rows.push(['Impostos', money(r.outflows?.taxes)]);
      rows.push(['Investimentos', money(r.outflows?.investments)]);
      rows.push(['Outras Saídas', money(r.outflows?.other)]);
      rows.push(['Total Saídas', money(r.outflows?.total)]);
      rows.push(['']);
      rows.push(['Fluxo Líquido', money(r.netCashFlow)]);
      rows.push(['Saldo Final', money(r.finalBalance)]);
    } else if (reportKind === 'profitability') {
      const r = report as ProfitabilityReport;
      rows.push(['ANÁLISE DE LUCRATIVIDADE']);
      rows.push(['Margem Bruta', pct(r.grossProfitMargin)]);
      rows.push(['Margem Operacional', pct(r.operatingMargin)]);
      rows.push(['Margem Líquida', pct(r.netMargin)]);
      rows.push(['ROI', pct(r.roi)]);
      rows.push(['Ponto de Equilíbrio', money(r.breakEvenPoint)]);
      rows.push(['Margem de Contribuição', pct(r.contributionMargin)]);
    } else if (reportKind === 'comparative') {
      const r = report as ComparativeReport;
      rows.push(['RELATÓRIO COMPARATIVO']);
      rows.push(['']);
      rows.push(['ATUAL - Receita Líquida', money(r.current?.netRevenue)]);
      rows.push(['ANTERIOR - Receita Líquida', money(r.previous?.netRevenue)]);
      rows.push(['Variação Receita', money(r.variation?.revenueVariation)]);
      rows.push(['Variação Receita (%)', pct(r.variation?.revenueVariationPercent)]);
      rows.push(['']);
      rows.push(['ATUAL - Lucro Líquido', money(r.current?.netProfit)]);
      rows.push(['ANTERIOR - Lucro Líquido', money(r.previous?.netProfit)]);
      rows.push(['Variação Lucro', money(r.variation?.netProfitVariation)]);
      rows.push(['Variação Lucro (%)', pct(r.variation?.netProfitVariationPercent)]);
    } else if (reportKind === 'indicators') {
      const r = report as FinancialIndicatorsReport;
      rows.push(['INDICADORES FINANCEIROS']);
      rows.push(['Liquidez Corrente', String(r.currentRatio ?? '')]);
      rows.push(['Liquidez Seca', String(r.quickRatio ?? '')]);
      rows.push(['Dívida/Patrimônio', String(r.debtToEquity ?? '')]);
      rows.push(['ROA', String(r.returnOnAssets ?? '')]);
      rows.push(['ROE', String(r.returnOnEquity ?? '')]);
      rows.push(['Giro de Estoque', String(r.inventoryTurnover ?? '')]);
      rows.push(['Giro de Recebíveis', String(r.receivablesTurnover ?? '')]);
    } else if (reportKind === 'products-timeseries') {
      const r = report as ProductTimeSeriesReport;
      rows.push(['RELATÓRIO DE PRODUTOS - EVOLUÇÃO']);
      rows.push(['Granularidade', String(r.granularity)]);
      rows.push(['Total (Qtd)', String(r.totals?.quantity ?? 0)]);
      rows.push(['Total (Receita)', money(r.totals?.revenue ?? 0)]);
      rows.push(['']);
      rows.push(['Período', 'Quantidade', 'Receita']);
      r.series?.forEach((p) => {
        rows.push([p.bucket, String(p.quantity ?? 0), money(p.revenue ?? 0)]);
      });
    } else if (reportKind === 'products-ranking') {
      const r = report as ProductRankingReport;
      rows.push(['RELATÓRIO DE PRODUTOS - RANKING']);
      rows.push(['Métrica', String(r.metric)]);
      rows.push(['Limite', String(r.limit)]);
      rows.push(['']);
      rows.push(['Produto', 'Quantidade', 'Receita']);
      r.items?.forEach((p) => {
        rows.push([p.productName, String(p.quantity ?? 0), money(p.revenue ?? 0)]);
      });
    } else if (reportKind === 'products-abc') {
      const r = report as ProductABCCurveReport;
      rows.push(['RELATÓRIO DE PRODUTOS - CURVA ABC']);
      rows.push(['Receita Total', money(r.totalRevenue ?? 0)]);
      rows.push(['']);
      rows.push(['Classe', 'Produto', 'Quantidade', 'Receita', 'Participação (%)', 'Acumulado (%)']);
      r.items?.forEach((p) => {
        rows.push([
          p.abcClass,
          p.productName,
          String(p.quantity ?? 0),
          money(p.revenue ?? 0),
          String(((p.share ?? 0) * 100).toFixed(2)),
          String(((p.cumulativeShare ?? 0) * 100).toFixed(2)),
        ]);
      });
    } else if (reportKind === 'customers-birthdays') {
      const r = report as BirthdayCustomersReport;
      rows.push(['CLIENTES ANIVERSARIANTES']);
      rows.push(['Total', String(r.total ?? 0)]);
      rows.push(['']);
      rows.push(['Cliente', 'Nascimento', 'Telefone', 'WhatsApp', 'Email']);
      r.customers?.forEach((c) => {
        rows.push([
          c.name,
          c.birthDate ? format(new Date(c.birthDate), 'dd/MM/yyyy') : '',
          c.phone ?? '',
          c.whatsapp ?? '',
          c.email ?? '',
        ]);
      });
    } else if (reportKind === 'sales-modules') {
      const r = report as SalesByModuleReport;
      rows.push(['COMPARATIVO DE VENDAS POR MÓDULO']);
      rows.push(['Total de Vendas', String(r.totals?.count ?? 0)]);
      rows.push(['Total (R$)', money(r.totals?.totalAmount ?? 0)]);
      rows.push(['']);
      rows.push(['Módulo', 'Quantidade', 'Total (R$)']);
      r.modules?.forEach((m) => {
        rows.push([m.label, String(m.count ?? 0), money(m.totalAmount ?? 0)]);
      });
    } else if (reportKind === 'sales-payments') {
      const r = report as SalesByPaymentMethodReport;
      rows.push(['VENDAS POR FORMA DE PAGAMENTO']);
      rows.push(['Total de Pagamentos', String(r.totals?.count ?? 0)]);
      rows.push(['Total (R$)', money(r.totals?.amount ?? 0)]);
      rows.push(['']);
      rows.push(['Forma de Pagamento', 'Quantidade', 'Total (R$)', 'Participação (%)']);
      r.methods?.forEach((m) => {
        rows.push([
          m.label,
          String(m.count ?? 0),
          money(m.amount ?? 0),
          String(((m.share ?? 0) * 100).toFixed(2)),
        ]);
      });
    } else if (reportKind === 'card-fees') {
      const r = report as CardFeesByPaymentMethodReport;
      rows.push(['TAXAS DE CARTÃO POR FORMA DE PAGAMENTO']);
      rows.push(['Total de Transações', String(r.totals?.count ?? 0)]);
      rows.push(['Total Processado (R$)', money(r.totals?.amount ?? 0)]);
      rows.push(['Total de Taxas (R$)', money(r.totals?.feeAmount ?? 0)]);
      rows.push(['']);
      rows.push(['Forma de Pagamento', 'Quantidade', 'Total (R$)', 'Taxa (%)', 'Taxa (R$)']);
      r.methods?.forEach((m) => {
        rows.push([
          m.label,
          String(m.count ?? 0),
          money(m.amount ?? 0),
          String(Number(m.feePercent ?? 0).toFixed(2)),
          money(m.feeAmount ?? 0),
        ]);
      });
    }

    const csv = rows.map((row) => row.join(',')).join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `relatorio-${reportKind}-${periodLabel}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadReportExport = async (format: 'pdf' | 'xlsx') => {
    if (!report) return;

    const params: Record<string, any> = {
      startDate,
      endDate,
    };

    if (reportKind === 'products-timeseries') {
      params.granularity = productGranularity;
    }
    if (reportKind === 'products-ranking') {
      params.metric = productMetric;
      params.limit = productLimit;
    }

    const financialTypes = new Set(['summary', 'dre', 'cash-flow', 'profitability', 'comparative', 'indicators']);
    const scope = financialTypes.has(reportKind) ? 'financial' : 'reports';

    const blob = await apiClient.downloadReportExport(scope as any, reportKind, format, params);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `relatorio-${reportKind}-${periodLabel}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (!report) return null;

    if (reportKind === 'summary') {
      const r = report as TransactionsSummaryReport;
      return (
        <Bar
          data={{
            labels: ['Receitas', 'Despesas', 'Pendentes', 'Pagas', 'Vencidas'],
            datasets: [
              {
                label: 'Valores',
                data: [r.totalIncome, r.totalExpense, r.pending, r.paid, r.overdue],
                backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ef4444'],
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'dre') {
      const r = report as DREReport;
      return (
        <Bar
          data={{
            labels: ['Receita Bruta', 'Receita Líquida', 'Lucro Bruto', 'Lucro Líquido'],
            datasets: [
              {
                label: 'R$',
                data: [r.grossRevenue, r.netRevenue, r.grossProfit, r.netProfit],
                backgroundColor: ['#38bdf8', '#22c55e', '#a855f7', '#f59e0b'],
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'cash-flow') {
      const r = report as CashFlowReport;
      return (
        <Bar
          data={{
            labels: ['Entradas', 'Saídas', 'Fluxo Líquido', 'Saldo Final'],
            datasets: [
              {
                label: 'R$',
                data: [r.inflows.total, r.outflows.total, r.netCashFlow, r.finalBalance],
                backgroundColor: ['#22c55e', '#ef4444', '#0ea5e9', '#a855f7'],
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'profitability') {
      const r = report as ProfitabilityReport;
      return (
        <Bar
          data={{
            labels: ['Margem Bruta', 'Margem Operacional', 'Margem Líquida', 'ROI', 'Margem Contribuição'],
            datasets: [
              {
                label: '%',
                data: [r.grossProfitMargin, r.operatingMargin, r.netMargin, r.roi, r.contributionMargin],
                backgroundColor: '#22c55e',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'comparative') {
      const r = report as ComparativeReport;
      return (
        <Bar
          data={{
            labels: ['Receita Líquida (Atual)', 'Receita Líquida (Anterior)', 'Lucro Líquido (Atual)', 'Lucro Líquido (Anterior)'],
            datasets: [
              {
                label: 'R$',
                data: [r.current.netRevenue, r.previous.netRevenue, r.current.netProfit, r.previous.netProfit],
                backgroundColor: ['#22c55e', '#94a3b8', '#0ea5e9', '#94a3b8'],
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'indicators') {
      const r = report as FinancialIndicatorsReport;
      return (
        <Bar
          data={{
            labels: ['Current', 'Quick', 'Debt/Equity', 'ROA', 'ROE', 'Inventory', 'Receivables'],
            datasets: [
              {
                label: 'Indicadores',
                data: [
                  r.currentRatio,
                  r.quickRatio,
                  r.debtToEquity,
                  r.returnOnAssets,
                  r.returnOnEquity,
                  r.inventoryTurnover,
                  r.receivablesTurnover,
                ],
                backgroundColor: '#0ea5e9',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'sales-modules') {
      const r = report as SalesByModuleReport;
      return (
        <Bar
          data={{
            labels: r.modules.map((m) => m.label),
            datasets: [
              {
                label: 'R$',
                data: r.modules.map((m) => m.totalAmount || 0),
                backgroundColor: '#38bdf8',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'sales-payments') {
      const r = report as SalesByPaymentMethodReport;
      return (
        <Pie
          data={{
            labels: r.methods.map((m) => m.label),
            datasets: [
              {
                label: 'R$',
                data: r.methods.map((m) => m.amount || 0),
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#94a3b8'],
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'card-fees') {
      const r = report as CardFeesByPaymentMethodReport;
      return (
        <Bar
          data={{
            labels: r.methods.map((m) => m.label),
            datasets: [
              {
                label: 'Taxa (R$)',
                data: r.methods.map((m) => m.feeAmount || 0),
                backgroundColor: '#f59e0b',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'products-timeseries') {
      const r = report as ProductTimeSeriesReport;
      return (
        <Line
          data={{
            labels: r.series.map((p) => p.bucket),
            datasets: [
              {
                label: 'Quantidade',
                data: r.series.map((p) => p.quantity || 0),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.2)',
              },
              {
                label: 'Receita',
                data: r.series.map((p) => p.revenue || 0),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.2)',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'products-ranking') {
      const r = report as ProductRankingReport;
      const values = r.metric === 'quantity' ? r.items.map((i) => i.quantity) : r.items.map((i) => i.revenue);
      return (
        <Bar
          data={{
            labels: r.items.map((i) => i.productName),
            datasets: [
              {
                label: r.metric === 'quantity' ? 'Quantidade' : 'Receita',
                data: values,
                backgroundColor: '#0ea5e9',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'products-abc') {
      const r = report as ProductABCCurveReport;
      return (
        <Bar
          data={{
            labels: r.items.map((i) => i.productName),
            datasets: [
              {
                label: 'Receita',
                data: r.items.map((i) => i.revenue),
                backgroundColor: '#a855f7',
              },
            ],
          }}
        />
      );
    }

    if (reportKind === 'customers-birthdays') {
      const r = report as BirthdayCustomersReport;
      return (
        <Doughnut
          data={{
            labels: ['Aniversariantes'],
            datasets: [
              {
                label: 'Total',
                data: [r.total || 0],
                backgroundColor: ['#f59e0b'],
              },
            ],
          }}
        />
      );
    }

    return null;
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <BarChart3 size={32} />
        <h1>Relatórios</h1>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <div className="reports-options-grid">
          <div>
            <label className="reports-label">Tipo de Relatório</label>
            <select
              title="Selecione o tipo de relatório"
              value={reportKind}
              onChange={(e) => {
                setReportKind(e.target.value as any);
                setReport(null);
              }}
              className="reports-select"
            >
              <option value="customers-birthdays">Clientes - Aniversariantes</option>
              <option value="sales-modules">Vendas - Comparativo por Módulo</option>
              <option value="sales-payments">Vendas - Por Forma de Pagamento</option>
              <option value="card-fees">Taxas de Cartão - Por Forma de Pagamento</option>
              <option value="dre">DRE (Resultado)</option>
              <option value="cash-flow">Fluxo de Caixa</option>
              <option value="profitability">Lucratividade</option>
              <option value="comparative">Comparativo</option>
              <option value="indicators">Indicadores</option>
              <option value="summary">Resumo de Transações</option>
              <option value="products-timeseries">Produtos - Evolução no período</option>
              <option value="products-ranking">Produtos - Ranking</option>
              <option value="products-abc">Produtos - Curva ABC</option>
            </select>
          </div>

          {reportKind !== 'indicators' && (
            <>
              <div>
                <label className="reports-label">Data Inicial</label>
                <input
                  type="date"
                  title="Selecione a data inicial"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="reports-input"
                />
              </div>

              <div>
                <label className="reports-label">Data Final</label>
                <input
                  type="date"
                  title="Selecione a data final"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="reports-input"
                />
              </div>
            </>
          )}

          {reportKind === 'products-timeseries' && (
            <div>
              <label className="reports-label">Granularidade</label>
              <select
                title="Selecione a granularidade"
                value={productGranularity}
                onChange={(e) => setProductGranularity(e.target.value as ProductReportGranularity)}
                className="reports-select"
              >
                <option value="day">Dia</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            </div>
          )}

          {reportKind === 'products-ranking' && (
            <>
              <div>
                <label className="reports-label">Métrica</label>
                <select
                  title="Selecione a métrica"
                  value={productMetric}
                  onChange={(e) => setProductMetric(e.target.value as ProductRankingMetric)}
                  className="reports-select"
                >
                  <option value="revenue">Receita</option>
                  <option value="quantity">Quantidade</option>
                </select>
              </div>
              <div>
                <label className="reports-label">Limite</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  title="Quantidade de produtos no ranking"
                  value={productLimit}
                  onChange={(e) => setProductLimit(Number(e.target.value || 20))}
                  className="reports-input"
                />
              </div>
            </>
          )}

          <div className="reports-button-wrapper">
            <Button variant="primary" onClick={handleGenerateReport} isLoading={loading}>
              Gerar Relatório
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Loading message="Gerando relatório..." />
      ) : report ? (
        <div className="reports-grid">
          <div className="reports-metrics">
            <Card>
              <div className="reports-metric-card reports-metric-period">
                <p className="reports-metric-label">Período</p>
                <p className="reports-metric-value">{periodLabel}</p>
              </div>
            </Card>

            {reportKind === 'dre' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Receita Líquida</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as DREReport).netRevenue || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Lucro Líquido</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as DREReport).netProfit || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {reportKind === 'cash-flow' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Fluxo Líquido</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as CashFlowReport).netCashFlow || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Saldo Final</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as CashFlowReport).finalBalance || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {reportKind === 'summary' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Receitas</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as TransactionsSummaryReport).totalIncome || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Despesas</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as TransactionsSummaryReport).totalExpense || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {(reportKind === 'products-timeseries' || reportKind === 'products-ranking') && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Quantidade (Total)</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      {Number((report as any)?.totals?.quantity || 0).toFixed(0)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Receita (Total)</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as any)?.totals?.revenue || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {reportKind === 'products-abc' && (
              <Card>
                <div className="reports-metric-card reports-metric-revenue">
                  <p className="reports-metric-label">Receita Total (ABC)</p>
                  <p className="reports-metric-value reports-metric-value-large">
                    R$ {Number((report as ProductABCCurveReport).totalRevenue || 0).toFixed(2)}
                  </p>
                </div>
              </Card>
            )}

            {reportKind === 'customers-birthdays' && (
              <Card>
                <div className="reports-metric-card reports-metric-sales">
                  <p className="reports-metric-label">Clientes Aniversariantes</p>
                  <p className="reports-metric-value reports-metric-value-large">
                    {Number((report as BirthdayCustomersReport).total || 0)}
                  </p>
                </div>
              </Card>
            )}

            {reportKind === 'sales-modules' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Total de Vendas</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      {Number((report as SalesByModuleReport).totals?.count || 0)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Valor Total</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as SalesByModuleReport).totals?.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {reportKind === 'sales-payments' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Pagamentos</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      {Number((report as SalesByPaymentMethodReport).totals?.count || 0)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Valor Total</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as SalesByPaymentMethodReport).totals?.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}

            {reportKind === 'card-fees' && (
              <>
                <Card>
                  <div className="reports-metric-card reports-metric-sales">
                    <p className="reports-metric-label">Total de Taxas</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as CardFeesByPaymentMethodReport).totals?.feeAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className="reports-metric-card reports-metric-revenue">
                    <p className="reports-metric-label">Valor Processado</p>
                    <p className="reports-metric-value reports-metric-value-large">
                      R$ {Number((report as CardFeesByPaymentMethodReport).totals?.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </>
            )}
          </div>

          {renderChart() && (
            <Card>
              <div className="reports-card-header">
                <h3 className="reports-section-title">Gráficos</h3>
              </div>
              <div className="reports-chart-wrapper">{renderChart()}</div>
            </Card>
          )}

          <Card>
            <div className="reports-card-header">
              <h3 className="reports-section-title">Detalhamento</h3>
              <div className="reports-card-actions">
                <Button variant="secondary" onClick={downloadReport}>
                  <Download size={16} />
                  Exportar CSV
                </Button>
                <Button variant="secondary" onClick={() => downloadReportExport('pdf')}>
                  Exportar PDF
                </Button>
                <Button variant="secondary" onClick={() => downloadReportExport('xlsx')}>
                  Exportar Excel
                </Button>
              </div>
            </div>

            {reportKind === 'dre' && (
              <div className="reports-details-grid">
                {([
                  ['Receita Bruta', (report as DREReport).grossRevenue],
                  ['Descontos', (report as DREReport).discounts],
                  ['Receita Líquida', (report as DREReport).netRevenue],
                  ['CPV (COGS)', (report as DREReport).costOfGoodsSold],
                  ['Lucro Bruto', (report as DREReport).grossProfit],
                  ['Margem Bruta (%)', (report as DREReport).grossProfitMargin],
                  ['Despesas Operacionais', (report as DREReport).operatingExpenses],
                  ['Lucro Operacional', (report as DREReport).operatingProfit],
                  ['Margem Operacional (%)', (report as DREReport).operatingMargin],
                  ['Receitas Financeiras', (report as DREReport).financialIncome],
                  ['Despesas Financeiras', (report as DREReport).financialExpenses],
                  ['Resultado Financeiro', (report as DREReport).financialResult],
                  ['Outras Receitas', (report as DREReport).otherIncome],
                  ['Outras Despesas', (report as DREReport).otherExpenses],
                  ['Lucro Antes de Impostos', (report as DREReport).profitBeforeTaxes],
                  ['Impostos', (report as DREReport).taxes],
                  ['Lucro Líquido', (report as DREReport).netProfit],
                  ['Margem Líquida (%)', (report as DREReport).netMargin],
                ] as Array<[string, number]>).map(([label, value]) => (
                  <div key={label} className="reports-detail-item">
                    <span className="reports-detail-label">{label}</span>
                    <span className="reports-detail-value">
                      {label.includes('(%)')
                        ? `${Number(value || 0).toFixed(2)}%`
                        : `R$ ${Number(value || 0).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {reportKind === 'cash-flow' && (
              <div className="reports-details-grid">
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Saldo Inicial</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as CashFlowReport).initialBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Entradas (Total)</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as CashFlowReport).inflows?.total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Saídas (Total)</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as CashFlowReport).outflows?.total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Fluxo Líquido</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as CashFlowReport).netCashFlow || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Saldo Final</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as CashFlowReport).finalBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {reportKind === 'profitability' && (
              <div className="reports-details-grid">
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Margem Bruta</span>
                  <span className="reports-detail-value">
                    {Number((report as ProfitabilityReport).grossProfitMargin || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Margem Operacional</span>
                  <span className="reports-detail-value">
                    {Number((report as ProfitabilityReport).operatingMargin || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Margem Líquida</span>
                  <span className="reports-detail-value">
                    {Number((report as ProfitabilityReport).netMargin || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">ROI</span>
                  <span className="reports-detail-value">
                    {Number((report as ProfitabilityReport).roi || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Ponto de Equilíbrio</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ProfitabilityReport).breakEvenPoint || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Margem de Contribuição</span>
                  <span className="reports-detail-value">
                    {Number((report as ProfitabilityReport).contributionMargin || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {reportKind === 'comparative' && (
              <div className="reports-details-grid">
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Atual - Receita Líquida</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).current?.netRevenue || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Anterior - Receita Líquida</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).previous?.netRevenue || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Variação Receita</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).variation?.revenueVariation || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Variação Receita (%)</span>
                  <span className="reports-detail-value">
                    {Number((report as ComparativeReport).variation?.revenueVariationPercent || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="reports-detail-item">
                  <span className="reports-detail-label">Atual - Lucro Líquido</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).current?.netProfit || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Anterior - Lucro Líquido</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).previous?.netProfit || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Variação Lucro</span>
                  <span className="reports-detail-value">
                    R$ {Number((report as ComparativeReport).variation?.netProfitVariation || 0).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Variação Lucro (%)</span>
                  <span className="reports-detail-value">
                    {Number((report as ComparativeReport).variation?.netProfitVariationPercent || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {reportKind === 'indicators' && (
              <div className="reports-details-grid">
                {([
                  ['Liquidez Corrente', (report as FinancialIndicatorsReport).currentRatio],
                  ['Liquidez Seca', (report as FinancialIndicatorsReport).quickRatio],
                  ['Dívida/Patrimônio', (report as FinancialIndicatorsReport).debtToEquity],
                  ['ROA', (report as FinancialIndicatorsReport).returnOnAssets],
                  ['ROE', (report as FinancialIndicatorsReport).returnOnEquity],
                  ['Giro de Estoque', (report as FinancialIndicatorsReport).inventoryTurnover],
                  ['Giro de Recebíveis', (report as FinancialIndicatorsReport).receivablesTurnover],
                ] as Array<[string, number]>).map(([label, value]) => (
                  <div key={label} className="reports-detail-item">
                    <span className="reports-detail-label">{label}</span>
                    <span className="reports-detail-value">
                      {value === undefined || value === null ? '' : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {reportKind === 'summary' && (
              <div className="reports-details-grid">
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Saldo (Receita - Despesa)</span>
                  <span className="reports-detail-value">
                    R$ {Number(((report as TransactionsSummaryReport).totalIncome || 0) - ((report as TransactionsSummaryReport).totalExpense || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Pendentes</span>
                  <span className="reports-detail-value">{Number((report as TransactionsSummaryReport).pending || 0)}</span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Pagas</span>
                  <span className="reports-detail-value">{Number((report as TransactionsSummaryReport).paid || 0)}</span>
                </div>
                <div className="reports-detail-item">
                  <span className="reports-detail-label">Vencidas</span>
                  <span className="reports-detail-value">{Number((report as TransactionsSummaryReport).overdue || 0)}</span>
                </div>
              </div>
            )}

            {reportKind === 'products-timeseries' && (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Quantidade</th>
                      <th>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report as ProductTimeSeriesReport).series?.map((p) => (
                      <tr key={p.bucket}>
                        <td>{p.bucket}</td>
                        <td>{Number(p.quantity || 0).toFixed(0)}</td>
                        <td>R$ {Number(p.revenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportKind === 'products-ranking' && (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report as ProductRankingReport).items?.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.productName}</td>
                        <td>{Number(p.quantity || 0).toFixed(0)}</td>
                        <td>R$ {Number(p.revenue || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportKind === 'products-abc' && (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Receita</th>
                      <th>Participação</th>
                      <th>Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report as ProductABCCurveReport).items?.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.abcClass}</td>
                        <td>{p.productName}</td>
                        <td>{Number(p.quantity || 0).toFixed(0)}</td>
                        <td>R$ {Number(p.revenue || 0).toFixed(2)}</td>
                        <td>{((p.share || 0) * 100).toFixed(2)}%</td>
                        <td>{((p.cumulativeShare || 0) * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportKind === 'customers-birthdays' && (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Nascimento</th>
                      <th>Telefone</th>
                      <th>WhatsApp</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report as BirthdayCustomersReport).customers?.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.birthDate ? format(new Date(c.birthDate), 'dd/MM/yyyy') : ''}</td>
                        <td>{c.phone ?? ''}</td>
                        <td>{c.whatsapp ?? ''}</td>
                        <td>{c.email ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportKind === 'sales-modules' && (
              <div className="reports-sales-module">
                <div className="reports-bar-chart">
                  {(report as SalesByModuleReport).modules?.map((m) => {
                    const max = Math.max(
                      ...((report as SalesByModuleReport).modules || []).map((item) => item.totalAmount || 0),
                      0
                    );
                    const width = max > 0 ? (m.totalAmount / max) * 100 : 0;
                    return (
                      <div key={m.module} className="reports-bar-row">
                        <div className="reports-bar-label">{m.label}</div>
                        <div className="reports-bar-track">
                          <div className="reports-bar-fill" style={{ width: `${width}%` }} />
                        </div>
                        <div className="reports-bar-value">R$ {Number(m.totalAmount || 0).toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="reports-table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Módulo</th>
                        <th>Quantidade</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report as SalesByModuleReport).modules?.map((m) => (
                        <tr key={m.module}>
                          <td>{m.label}</td>
                          <td>{Number(m.count || 0)}</td>
                          <td>R$ {Number(m.totalAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportKind === 'sales-payments' && (
              <div className="reports-sales-payments">
                <div className="reports-bar-chart">
                  {(report as SalesByPaymentMethodReport).methods?.map((m) => {
                    const max = Math.max(
                      ...((report as SalesByPaymentMethodReport).methods || []).map((item) => item.amount || 0),
                      0
                    );
                    const width = max > 0 ? (m.amount / max) * 100 : 0;
                    return (
                      <div key={m.paymentMethod} className="reports-bar-row">
                        <div className="reports-bar-label">{m.label}</div>
                        <div className="reports-bar-track">
                          <div className="reports-bar-fill reports-bar-fill-alt" style={{ width: `${width}%` }} />
                        </div>
                        <div className="reports-bar-value">R$ {Number(m.amount || 0).toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="reports-table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Forma</th>
                        <th>Quantidade</th>
                        <th>Total</th>
                        <th>Participação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report as SalesByPaymentMethodReport).methods?.map((m) => (
                        <tr key={m.paymentMethod}>
                          <td>{m.label}</td>
                          <td>{Number(m.count || 0)}</td>
                          <td>R$ {Number(m.amount || 0).toFixed(2)}</td>
                          <td>{((m.share || 0) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportKind === 'card-fees' && (
              <div className="reports-sales-payments">
                <div className="reports-table-wrapper">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Forma</th>
                        <th>Quantidade</th>
                        <th>Total</th>
                        <th>Taxa (%)</th>
                        <th>Taxa (R$)</th>
                        <th>Participação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report as CardFeesByPaymentMethodReport).methods?.map((m) => {
                        const totalFee = Number((report as CardFeesByPaymentMethodReport).totals?.feeAmount || 0);
                        const share = totalFee > 0 ? (Number(m.feeAmount || 0) / totalFee) * 100 : 0;
                        return (
                          <tr key={m.paymentMethod}>
                            <td>{m.label}</td>
                            <td>{Number(m.count || 0)}</td>
                            <td>R$ {Number(m.amount || 0).toFixed(2)}</td>
                            <td>{Number(m.feePercent || 0).toFixed(2)}%</td>
                            <td>R$ {Number(m.feeAmount || 0).toFixed(2)}</td>
                            <td>{share.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
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
