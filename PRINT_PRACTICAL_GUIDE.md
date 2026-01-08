# 🖨️ Guia Prático - Sistema de Impressão

## 📚 Índice Rápido
1. [Estrutura das Impressões](#estrutura-das-impressões)
2. [Como Adicionar Novas Impressões](#como-adicionar-novas-impressões)
3. [Personalizações](#personalizações)
4. [Troubleshooting](#troubleshooting)

---

## 🏗️ Estrutura das Impressões

### Pattern Padrão

Todas as impressões seguem este padrão:

```typescript
import { printReceipt, formatCurrency } from '@/utils/printer';

const handlePrint = (data: any) => {
  // 1. Preparar dados
  const formatted = {
    title: 'Título do Documento',
    subtitle: 'Subtítulo',
    date: new Date().toLocaleString('pt-BR')
  };

  // 2. Criar conteúdo HTML
  const content = `
    <div class="print-header">
      <div class="print-header-title">${formatted.title}</div>
      <div class="print-header-subtitle">${formatted.subtitle}</div>
      <div class="print-header-info">${formatted.date}</div>
    </div>

    <div class="print-section">
      <div class="print-section-title">Seção 1</div>
      <div class="print-row">
        <span class="print-row-label">Campo</span>
        <span class="print-row-value">Valor</span>
      </div>
    </div>

    <div class="print-footer">
      <div class="print-footer-text">Mensagem Final</div>
    </div>
  `;

  // 3. Abrir impressão
  printReceipt({
    title: formatted.title,
    subtitle: formatted.subtitle,
    content
  });
};
```

---

## ➕ Como Adicionar Novas Impressões

### Passo 1: Importar Utilitários

```typescript
import { printReceipt, formatCurrency } from '@/utils/printer';
```

### Passo 2: Criar Função de Impressão

```typescript
const handlePrintCustom = (data: any) => {
  // Seu código aqui
};
```

### Passo 3: Montar Conteúdo HTML

Use classes `.print-*` para consistência:

```typescript
const content = `
  <div class="print-header">
    <div class="print-header-title">MEU DOCUMENTO</div>
    <div class="print-header-subtitle">Subtítulo</div>
  </div>

  <div class="print-section">
    <div class="print-section-title">Seção Principal</div>
    <!-- Seu conteúdo aqui -->
  </div>

  <div class="print-footer">
    <div class="print-footer-text">Rodapé</div>
  </div>
`;
```

### Passo 4: Disparar Impressão

```typescript
printReceipt({
  title: 'Meu Documento',
  subtitle: 'Gelatini',
  content
});
```

---

## 🎨 Exemplos Práticos

### Exemplo 1: Linha Simples de Dado

```typescript
<div class="print-row">
  <span class="print-row-label">Cliente:</span>
  <span class="print-row-value">João Silva</span>
</div>
```

**Resultado na Impressão:**
```
Cliente:                        João Silva
```

---

### Exemplo 2: Tabela de Itens

```typescript
const itemsHTML = items.map(item => `
  <tr>
    <td class="print-table-item-name">${item.name}</td>
    <td class="print-table-col-qty">${item.qty}</td>
    <td class="print-table-col-total">${formatCurrency(item.total)}</td>
  </tr>
`).join('');

const content = `
  <table class="print-table">
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="print-table-col-qty">Qtd</th>
        <th class="print-table-col-total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>
`;
```

**Resultado:**
```
Descrição                    Qtd      Total
────────────────────────────────────────────
Açaí com Granola              1    R$ 15,00
Sorvete de Baunilha           2    R$ 18,00
Açaí com Morango              1    R$ 15,00
```

---

### Exemplo 3: Totalizador

```typescript
const content = `
  <div class="print-totals">
    <div class="print-row">
      <span class="print-row-label">Subtotal:</span>
      <span class="print-row-value">${formatCurrency(subtotal)}</span>
    </div>
    <div class="print-row">
      <span class="print-row-label">Desconto:</span>
      <span class="print-row-value">-${formatCurrency(discount)}</span>
    </div>
    <div class="print-row total highlight">
      <span class="print-row-label">TOTAL:</span>
      <span class="print-row-value">${formatCurrency(total)}</span>
    </div>
  </div>
`;
```

**Resultado:**
```
Subtotal:                    R$ 150,00
Desconto:                    -R$  15,00
═════════════════════════════════════════
TOTAL:                       R$ 135,00
```

---

### Exemplo 4: Seções com Conteúdo

```typescript
const content = `
  <div class="print-section">
    <div class="print-section-title">Dados do Cliente</div>
    <div class="print-row">
      <span class="print-row-label">Nome:</span>
      <span class="print-row-value">João Silva</span>
    </div>
    <div class="print-row">
      <span class="print-row-label">Telefone:</span>
      <span class="print-row-value">(11) 98765-4321</span>
    </div>
  </div>

  <div class="print-section">
    <div class="print-section-title">Endereço</div>
    <div style="font-size: 10px;">
      Rua Exemplo, 123 - Ap 456
      Bairro - Cidade/SP
      CEP: 12345-678
    </div>
  </div>
`;
```

**Resultado:**
```
DADOS DO CLIENTE
────────────────
Nome:                       João Silva
Telefone:               (11) 98765-4321

ENDEREÇO
────────────────
Rua Exemplo, 123 - Ap 456
Bairro - Cidade/SP
CEP: 12345-678
```

---

## 🎯 Personalizações

### Adicionar Logotipo/Cabeçalho Especial

```typescript
const content = `
  <div class="print-header">
    <div style="font-size: 24px; text-align: center;">🍦</div>
    <div class="print-header-title">GELATINI</div>
    <div class="print-header-subtitle">Gelados & Açaí</div>
    <div class="print-header-info">Rua das Flores, 123</div>
    <div class="print-header-info">Tel: (11) 3333-3333</div>
  </div>
`;
```

---

### Destacar Seções Especiais

```typescript
// Usar cores/emojis
<div class="print-section">
  <div class="print-section-title">⚠️ AVISOS IMPORTANTES</div>
  <div style="font-size: 10px; line-height: 1.6;">
    • Verificar quantidade de itens
    • Confirmar dados do endereço
    • Ligar para confirmar horário
  </div>
</div>
```

---

### Adicionar Linha de Assinatura

```typescript
<div class="print-section" style="margin-top: 8mm;">
  <div class="print-row" style="border-bottom: 1px solid #000; padding-bottom: 2mm;">
    <span>Assinado por: _________________</span>
  </div>
  <div class="print-row" style="font-size: 9px; margin-top: 3mm;">
    <span>Data: _____/_____/________</span>
  </div>
</div>
```

---

### Adicionar QR Code (Futuro)

```typescript
// Placeholder para QR Code
<div class="print-section" style="text-align: center;">
  <div style="font-size: 32px; margin: 5mm 0;">
    ██████████
    █ QR_CODE █
    ██████████
  </div>
  <div style="font-size: 9px;">Escaneie para confirmação</div>
</div>
```

---

## 🔧 Dicas de Formatação

### Quebra de Linha para Textos Longos

```typescript
const maxWidth = 70; // mm
const chunks = text.match(/.{1,42}/g) || []; // 42 chars por linha

const content = `
  <div style="font-size: 10px; white-space: pre-wrap;">
    ${chunks.join('\n')}
  </div>
`;
```

---

### Centralizar Texto

```typescript
<div style="text-align: center; font-size: 11px; font-weight: bold;">
  DOCUMENTO IMPORTANTE
</div>
```

---

### Espaçamento Entre Elementos

```typescript
<!-- Pequeno espaço (2mm) -->
<div style="height: 2mm;"></div>

<!-- Médio espaço (5mm) -->
<div style="height: 5mm;"></div>

<!-- Grande espaço (10mm) -->
<div style="height: 10mm;"></div>
```

---

### Cores (Impressoras com Suporte)

```typescript
<!-- ⚠️ Nota: Nem todas as impressoras térmicas suportam cores -->
<div style="color: #d32f2f; font-weight: bold;">
  ⚠️ SALDO NEGATIVO
</div>
```

---

## 🐛 Troubleshooting

### Problema: Conteúdo Não Cabe no Papel

**Solução:**
- Reduza fonte: `font-size: 9px` em vez de `10px`
- Remova espaçamentos: `margin: 0; padding: 0;`
- Abrevie nomes: "Comanda #" em vez de "Número da Comanda"

---

### Problema: Impressão Sai com Margens Grandes

**Solução:**
```typescript
@media print {
  body { margin: 0; padding: 0; }
  .print-header { padding: 3mm; }
}
```

---

### Problema: Caracteres Especiais Não Saem

**Solução:**
```html
<!-- Adicione charset -->
<meta charset="UTF-8">

<!-- Use HTML entities se necessário -->
&nbsp; = espaço
&deg; = °
&copy; = ©
```

---

### Problema: Impressora Não Reconhece Tamanho

**Solução:**
```css
@page { 
  size: 80mm auto;  /* Especificar 80mm */
  margin: 0;        /* Remover margens padrão */
}
```

---

### Problema: Fonte Ilegível na Impressora

**Solução:**
- Aumente tamanho: `font-size: 12px`
- Use negrito: `font-weight: bold`
- Aumente espaçamento: `line-height: 1.5`

---

## 📋 Checklist para Novas Impressões

- [ ] Importe `printReceipt` e `formatCurrency`
- [ ] Crie função `handlePrint*`
- [ ] Use classes `.print-*`
- [ ] Teste se cabe em 70mm de largura
- [ ] Verifique fontes legíveis (mín. 9px)
- [ ] Adicione header e footer
- [ ] Teste com "Salvar como PDF"
- [ ] Teste com impressora real (se possível)
- [ ] Documente a função
- [ ] Adicione ao arquivo correspondente

---

## 🔗 Referências Rápidas

**Arquivo Principal**: `frontend/src/utils/printer.ts`

**Funções Disponíveis:**
- `printReceipt(options)` - Abre impressão
- `formatCurrency(value)` - Formata valor
- `truncateText(text, maxLength)` - Trunca texto
- `getPrintStyles()` - Retorna CSS

**Classes CSS (23 total):**
```
.print-header .print-header-title .print-header-subtitle
.print-header-info .print-section .print-section-title
.print-row .print-row-label .print-row-value
.print-row.highlight .print-row.total
.print-table .print-table-item-name .print-table-item-detail
.print-table-col-qty .print-table-col-price .print-table-col-total
.print-totals .print-footer .print-footer-text .print-footer-line
.text-center .text-right .font-bold .font-small
```

---

## ✅ Implementações Atuais

| Módulo | Função | Linhas |
|--------|--------|--------|
| CashPage | `handlePrintClosingReceipt()` | 36-127 |
| ComandasPage | `handlePrintPreBill()` | 445-520 |
| SalesPage | `handlePrintPreview()` | 267-386 |
| DeliveryPage | `handlePrintOrder()` | 513-608 |

---

**Versão**: 1.0  
**Última Atualização**: Janeiro de 2026  
**Status**: ✅ Pronto para Produção
