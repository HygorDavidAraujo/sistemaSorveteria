import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const sanitizeSheetName = (name: string) => {
  const cleaned = name.replace(/[\\/?*\[\]]/g, ' ').trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned || 'Sheet';
};

const collectTables = (value: unknown, path: string[], tables: Array<{ name: string; rows: any[] }>) => {
  if (Array.isArray(value)) {
    tables.push({ name: path.join('.'), rows: value });
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      collectTables(nested, [...path, key], tables);
    });
  }
};

const collectSummary = (value: unknown, path: string[], rows: Array<[string, string]>) => {
  if (Array.isArray(value)) return;
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      collectSummary(nested, [...path, key], rows);
    });
    return;
  }
  const label = path.join('.');
  rows.push([label, formatValue(value)]);
};

const buildSummaryAndTables = (data: any) => {
  const summaryRows: Array<[string, string]> = [];
  const tables: Array<{ name: string; rows: any[] }> = [];
  collectSummary(data, [], summaryRows);
  collectTables(data, [], tables);
  return { summaryRows, tables };
};

export class ReportExportService {
  async buildExcel(reportTitle: string, data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GELATINI';
    workbook.created = new Date();

    const { summaryRows, tables } = buildSummaryAndTables(data);

    const summarySheet = workbook.addWorksheet('Resumo');
    summarySheet.columns = [
      { header: 'Campo', key: 'field', width: 40 },
      { header: 'Valor', key: 'value', width: 40 },
    ];
    summarySheet.addRow(['Relatório', reportTitle]);
    summarySheet.addRow([]);
    summaryRows.forEach(([field, value]) => {
      summarySheet.addRow([field, value]);
    });

    tables.forEach((table) => {
      const sheetName = sanitizeSheetName(table.name || 'Dados');
      const sheet = workbook.addWorksheet(sheetName);
      const rows = Array.isArray(table.rows) ? table.rows : [];
      if (rows.length === 0) {
        sheet.addRow(['Sem dados']);
        return;
      }

      const firstRow = rows[0];
      if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
        const headers = Array.from(
          rows.reduce((set, row) => {
            Object.keys(row || {}).forEach((key) => set.add(key));
            return set;
          }, new Set<string>())
        );
        sheet.columns = headers.map((header) => ({ header, key: header, width: 24 }));
        rows.forEach((row) => {
          sheet.addRow(headers.map((h) => formatValue((row as any)?.[h])));
        });
      } else {
        sheet.columns = [{ header: 'Valor', key: 'value', width: 40 }];
        rows.forEach((row) => sheet.addRow([formatValue(row)]));
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async buildPdf(reportTitle: string, data: any): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const { summaryRows, tables } = buildSummaryAndTables(data);

    doc.fontSize(18).text(reportTitle, { align: 'left' });
    doc.moveDown(0.5);

    doc.fontSize(12).text('Resumo', { underline: true });
    doc.moveDown(0.5);

    summaryRows.forEach(([field, value]) => {
      doc.fontSize(10).text(`${field}: ${value}`);
    });

    tables.forEach((table) => {
      doc.addPage();
      doc.fontSize(12).text(table.name || 'Dados', { underline: true });
      doc.moveDown(0.5);

      const rows = Array.isArray(table.rows) ? table.rows : [];
      if (rows.length === 0) {
        doc.text('Sem dados');
        return;
      }

      const firstRow = rows[0];
      if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
        const headers = Array.from(
          rows.reduce((set, row) => {
            Object.keys(row || {}).forEach((key) => set.add(key));
            return set;
          }, new Set<string>())
        );
        doc.fontSize(9).text(headers.join(' | '));
        doc.moveDown(0.3);
        rows.forEach((row) => {
          const values = headers.map((h) => formatValue((row as any)?.[h]));
          doc.text(values.join(' | '));
        });
      } else {
        rows.forEach((row) => doc.text(formatValue(row)));
      }
    });

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    return Buffer.concat(chunks);
  }
}
