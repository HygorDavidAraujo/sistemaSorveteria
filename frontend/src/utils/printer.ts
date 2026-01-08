/**
 * Utilitário para impressão em impressoras térmicas de 80mm
 * Otimizado para legibilidade e formatação padrão
 */

import { apiClient } from '@/services/api';

let cachedCompanyInfo: any = null;

export const getCompanyInfo = async () => {
  if (cachedCompanyInfo) return cachedCompanyInfo;
  
  try {
    const response = await apiClient.get('/settings/company-info');
    if (response && response.data) {
      cachedCompanyInfo = response.data;
      return cachedCompanyInfo;
    }
  } catch (error) {
    console.error('Erro ao carregar informações da empresa para impressão:', error);
  }
  
  return null;
};

export const PRINTER_CONFIG = {
  paperWidth: '80mm',
  contentWidth: '70mm',
  maxCharsPerLine: 42, // Aproximadamente 42 caracteres em monospace 10px
};

export const getPrintStyles = () => `
  @page {
    size: 80mm auto;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.4;
    margin: 0;
    padding: 5mm;
    width: ${PRINTER_CONFIG.contentWidth};
    background: white;
  }

  .print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 4mm;
    padding-bottom: 3mm;
    border-bottom: 1px dashed #000;
    gap: 3mm;
  }

  .print-header-logo {
    width: 20mm;
    height: 20mm;
    flex-shrink: 0;
  }

  .print-header-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .print-header-info {
    flex: 1;
    text-align: right;
  }

  .print-header-title {
    font-size: 13px;
    font-weight: bold;
    margin: 0 0 2mm 0;
    letter-spacing: 1px;
  }

  .print-header-subtitle {
    font-size: 10px;
    margin: 1mm 0;
    color: #333;
  }

  .print-header-info {
    font-size: 9px;
    margin: 0.5mm 0;
    color: #555;
  }

  .print-section {
    margin: 3mm 0;
    padding: 2mm 0;
  }

  .print-section-title {
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 2mm;
    padding-bottom: 1mm;
    border-bottom: 1px solid #ddd;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .print-row {
    display: flex;
    justify-content: space-between;
    margin: 2mm 0;
    font-size: 10px;
  }

  .print-row-label {
    flex-grow: 1;
  }

  .print-row-value {
    text-align: right;
    font-weight: normal;
    min-width: 20mm;
  }

  .print-row.highlight {
    font-weight: bold;
    font-size: 11px;
    border-top: 1px solid #ddd;
    padding-top: 2mm;
    margin-top: 2mm;
  }

  .print-row.total {
    font-weight: bold;
    font-size: 12px;
    border-bottom: 1px dashed #000;
    padding: 2mm 0;
  }

  .print-table {
    width: 100%;
    margin: 3mm 0;
    border-collapse: collapse;
  }

  .print-table thead {
    border-bottom: 1px solid #ddd;
  }

  .print-table th {
    text-align: left;
    font-weight: bold;
    font-size: 10px;
    padding: 2mm 0;
    border-bottom: 1px solid #ddd;
  }

  .print-table td {
    padding: 2mm 0;
    font-size: 10px;
    vertical-align: top;
  }

  .print-table-item-name {
    max-width: 35mm;
    word-break: break-word;
    font-weight: 500;
  }

  .print-table-item-detail {
    font-size: 9px;
    color: #666;
    margin-top: 0.5mm;
  }

  .print-table-col-qty {
    text-align: right;
    width: 12mm;
  }

  .print-table-col-price {
    text-align: right;
    width: 15mm;
  }

  .print-table-col-total {
    text-align: right;
    width: 18mm;
    font-weight: bold;
  }

  .print-totals {
    border-top: 1px dashed #000;
    border-bottom: 1px dashed #000;
    padding: 4mm 0;
    margin: 4mm 0;
  }

  .print-footer {
    text-align: center;
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px dashed #000;
    font-size: 9px;
  }

  .print-footer-text {
    margin: 1mm 0;
  }

  .print-footer-line {
    margin-top: 4mm;
    font-size: 8px;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .font-bold {
    font-weight: bold;
  }

  .font-small {
    font-size: 9px;
  }

  .spacer {
    height: 3mm;
  }

  .dashed-line {
    border-bottom: 1px dashed #000;
    margin: 2mm 0;
  }

  @media print {
    body {
      margin: 0;
      padding: 3mm;
    }
    .no-print {
      display: none !important;
    }
  }
`;

interface PrintOptions {
  title: string;
  subtitle?: string;
  content: string;
}

export const printReceipt = async (options: PrintOptions) => {
  const { title, subtitle, content } = options;
  const companyInfo = await getCompanyInfo();

  let logoHtml = '';
  let companyHeaderHtml = '';

  if (companyInfo) {
    if (companyInfo.logoBase64 && companyInfo.logoMimeType) {
      const logoUrl = `data:${companyInfo.logoMimeType};base64,${companyInfo.logoBase64}`;
      logoHtml = `<div class="print-header-logo"><img src="${logoUrl}" alt="Logo" /></div>`;
    }
    
    companyHeaderHtml = `
      <div class="print-header-info">
        <div class="print-header-title">${companyInfo.tradeName || 'Sorveteria'}</div>
        ${companyInfo.phone ? `<div class="print-header-subtitle">Tel: ${companyInfo.phone}</div>` : ''}
      </div>
    `;
  }

  const headerHtml = logoHtml || companyHeaderHtml ? `
    <div class="print-header">
      ${logoHtml}
      ${companyHeaderHtml}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>
        ${headerHtml}
        ${content}
      </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 100);
  }
};

export const formatCurrency = (value: number): string => {
  return `R$ ${Number(value || 0).toFixed(2)}`;
};

export const centerText = (text: string, maxWidth: number = PRINTER_CONFIG.maxCharsPerLine): string => {
  const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
  return ' '.repeat(padding) + text;
};

export const truncateText = (text: string, maxLength: number = PRINTER_CONFIG.maxCharsPerLine): string => {
  return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
};

export const createReceiptRow = (label: string, value: string, maxWidth: number = PRINTER_CONFIG.maxCharsPerLine): string => {
  const truncatedLabel = truncateText(label, maxWidth - 20);
  const truncatedValue = truncateText(value, 18);
  const spaces = ' '.repeat(Math.max(1, maxWidth - truncatedLabel.length - truncatedValue.length));
  return truncatedLabel + spaces + truncatedValue;
};
