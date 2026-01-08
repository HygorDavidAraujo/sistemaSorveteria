# 🖨️ Configuração de Impressão para Impressoras de 80mm

## ✅ Status de Implementação

### Módulos com Impressão Configurada

| Módulo | Tipo de Impressão | Status | Localização |
|--------|------------------|--------|-------------|
| **Caixa** | Fechamento de Caixa | ✅ Implementado | [CashPage.tsx](../frontend/src/pages/CashPage.tsx#L7) |
| **Comandas** | Pré-Conta | ✅ Implementado | [ComandasPage.tsx](../frontend/src/pages/ComandasPage.tsx#L7) |
| **Vendas PDV** | Pré-Conta | ✅ Implementado | [SalesPage.tsx](../frontend/src/pages/SalesPage.tsx#L7) |
| **Delivery** | Pedido + Entrega | ✅ Implementado | [DeliveryPage.tsx](../frontend/src/pages/DeliveryPage.tsx#L6) |

---

## 📋 Configurações Aplicadas

### 1. **Especificações Técnicas**
- **Largura do Papel**: 80mm
- **Largura de Conteúdo**: 70mm (considerando margens)
- **Fonte Principal**: Courier New, monospace (11px)
- **Font de Headers**: 13px bold
- **Fonte de Detalhes**: 9-10px
- **Tipo de Página**: A4 vertical, configurado para 80mm

### 2. **Componentes de Layout Padronizados**

#### Header (Cabeçalho)
```
┌─────────────────────────────────┐
│     FECHAMENTO DE CAIXA         │ (13px, bold)
│  Gelatini - Gelados & Açaí      │ (10px)
│  Terminal: TERMINAL_01          │ (9px)
│  Operador: João Silva           │ (9px)
└─────────────────────────────────┘
```

#### Seções
- Título de seção: 11px bold, com borda inferior
- Conteúdo: 10px, alinhado com espaçamento 2mm
- Separador entre seções: linha tracejada

#### Tabelas
- Header: 10px bold, borda inferior sólida
- Dados: 10px, borda inferior tracejada
- Colunas:
  - Descrição/Item: ~35mm (flex)
  - Quantidade: 12mm (alinhado à direita)
  - Preço Unitário: 15mm (alinhado à direita)
  - Total: 18mm (alinhado à direita, bold)

#### Totalizador
```
┌─────────────────────────────────┐
│  Subtotal:          R$ 150,00   │
│  Desconto:           -R$ 15,00  │
├─────────────────────────────────┤
│  TOTAL:             R$ 135,00   │ (bold, larger)
└─────────────────────────────────┘
```

#### Footer (Rodapé)
```
─────────────────────────────────
  Obrigado pela preferência!
  Documento não fiscal
  Gelatini © 2024
─────────────────────────────────
```

---

## 🎨 Utilitários de Impressão

### Arquivo Principal: `frontend/src/utils/printer.ts`

#### Funções Disponíveis

1. **`getPrintStyles()`**
   - Retorna CSS padronizado para 80mm
   - Classes pré-definidas: `.print-header`, `.print-section`, `.print-table`, etc.
   - Responsivo para impressoras térmicas

2. **`printReceipt(options)`**
   - Abre janela de impressão com conteúdo formatado
   - Parâmetros:
     - `title`: Título do documento
     - `subtitle`: Subtítulo (opcional)
     - `content`: HTML do conteúdo (usa classes pré-definidas)

3. **`formatCurrency(value)`**
   - Formata valores em R$ com 2 casas decimais
   - Exemplo: `formatCurrency(150.5)` → `"R$ 150.50"`

4. **`truncateText(text, maxLength)`**
   - Trunca texto para caber na largura máxima
   - Padrão: 42 caracteres (máximo por linha)

5. **`createReceiptRow(label, value, maxWidth)`**
   - Cria linha formatada com label + valor alinhado
   - Espaçamento automático

---

## 📑 Guia de Impressão por Módulo

### 1. **Caixa (CashPage)**

#### Quando Imprimir:
- Ao **fechar a sessão de caixa**

#### Conteúdo:
- ✅ Dados da sessão (terminal, operador, datas)
- ✅ Resumo de vendas (dinheiro, cartão, PIX)
- ✅ Conferência de caixa (esperado vs. declarado)
- ✅ Diferença (caixa + / - )
- ✅ Linhas para assinatura

#### Função: `handlePrintClosingReceipt(sessionData, declaredCash)`

---

### 2. **Comandas (ComandasPage)**

#### Quando Imprimir:
- **Pré-Conta**: Antes de fechar a comanda (para cliente verificar)
- Botão "Pré-Conta" na aba da comanda

#### Conteúdo:
- ✅ Número da comanda
- ✅ Mesa/Identificação
- ✅ Cliente
- ✅ Data e hora
- ✅ Itens (descrição, qtd, valor, subtotal)
- ✅ Subtotal, Desconto (se houver), Total
- ✅ Marca como "Documento não fiscal"

#### Função: `handlePrintPreBill()`

---

### 3. **Vendas PDV (SalesPage)**

#### Quando Imprimir:
- **Pré-Conta**: Antes de finalizar venda
- Botão "Imprimir" na revisão de venda

#### Conteúdo:
- ✅ Cabeçalho "PRÉ-CONTA"
- ✅ Cliente
- ✅ Data e hora
- ✅ Itens (produto, quantidade, preço unitário, total)
- ✅ Subtotal, Desconto (se houver), Total
- ✅ Formas de pagamento (se selecionadas)
- ✅ Troco/Falta (se aplicável)
- ✅ Marca como "Documento não fiscal"

#### Função: `handlePrintPreview()`

---

### 4. **Delivery (DeliveryPage)**

#### Quando Imprimir:
- **Pedido**: Ao criar novo pedido de delivery
- **Entrega**: Ao atualizar status para "entregue"

#### Conteúdo:
- ✅ Badge "🚚 DELIVERY"
- ✅ Número do pedido
- ✅ Data e hora
- ✅ Dados do cliente (nome, telefone)
- ✅ Endereço de entrega completo
- ✅ Itens do pedido (descrição, qtd, subtotal)
- ✅ Subtotal, Taxa de Entrega, Desconto (se houver), Total
- ✅ Observações do cliente
- ✅ Observações internas
- ✅ Tempo estimado de preparo

#### Função: `handlePrintOrder(order)`

---

## 🔧 Classes CSS Disponíveis

```css
.print-header          /* Container do cabeçalho */
.print-header-title    /* Título principal */
.print-header-subtitle /* Subtítulo */
.print-header-info     /* Informações do cabeçalho */

.print-section         /* Container de seção */
.print-section-title   /* Título da seção */

.print-row             /* Linha de conteúdo */
.print-row-label       /* Label da linha */
.print-row-value       /* Valor da linha */
.print-row.highlight   /* Linha destacada */
.print-row.total       /* Linha de total */

.print-table           /* Tabela de itens */
.print-table-item-name /* Nome do item */
.print-table-item-detail /* Detalhe do item */
.print-table-col-qty   /* Coluna de quantidade */
.print-table-col-price /* Coluna de preço */
.print-table-col-total /* Coluna de total */

.print-totals          /* Container de totalizador */
.print-footer          /* Rodapé */
.print-footer-text     /* Texto do rodapé */
.print-footer-line     /* Linha do rodapé */

.text-center           /* Alinhamento ao centro */
.text-right            /* Alinhamento à direita */
.font-bold             /* Texto em negrito */
.font-small            /* Texto pequeno (9px) */
```

---

## 📏 Dimensões Padrão

| Elemento | Tamanho | Notas |
|----------|---------|-------|
| Papel | 80mm | Largura total (térmica) |
| Conteúdo | 70mm | 70mm com 5mm de margem cada lado |
| Caracteres | 42 chars | Máximo por linha em Courier New 10px |
| Fonte Normal | 11px | Legibilidade padrão |
| Fonte Header | 13px | Títulos principais |
| Fonte Detalhe | 9px | Informações secundárias |
| Altura Linha | 1.4 | Line-height para legibilidade |
| Espaço Seção | 3mm | Entre seções |
| Espaço Linha | 2mm | Entre linhas de dados |

---

## 🖨️ Testando Impressão

### No Navegador:
1. Clique no botão de impressão (Imprimir/Print)
2. Escolha "Salvar como PDF" para testar formatação
3. Verifique se todo conteúdo cabe em 80mm de largura
4. Confirme que fontes estão legíveis (sem apertado)

### Na Impressora Térmica Real:
1. Configure impressora para 80mm (tipo Zebra, Bematech, etc.)
2. Use driver de impressora apropriado
3. Teste com impressora conectada via USB/Ethernet
4. Ajuste de margem no driver se necessário

---

## 💡 Melhorias Implementadas

✅ **Fontes Monospace Legíveis**
- Courier New em tamanho adequado (9-13px)
- Excelente para impressoras térmicas

✅ **Layout Otimizado para 80mm**
- Conteúdo nunca ultrapassa 70mm
- Tabelas com colunas pré-dimensionadas
- Quebra automática de linhas longas

✅ **Estrutura Padronizada**
- Todas as impressões seguem mesmo padrão
- Componentes reutilizáveis
- Fácil manutenção futura

✅ **Formatação Clara**
- Linhas divisórias (tracejadas/sólidas)
- Seções bem delimitadas
- Informações agrupadas logicamente

✅ **Funcionalidades Específicas**
- Linhas para assinatura (Caixa)
- Ícones emoji para destaque (Delivery)
- Observações do cliente (Delivery)
- Formas de pagamento (Vendas)
- Troco/Falta (Vendas)

---

## 📝 Próximos Passos (Opcional)

- [ ] Integrar com API de impressora térmica (ImpactoJS)
- [ ] Configurações de impressora (margem, densidade, velocidade)
- [ ] Salvar cópia de todos os recibos em PDF
- [ ] Relatório consolidado de todas as impressões
- [ ] QR Code nos recibos (Delivery/Pedidos)
- [ ] Suporte a múltiplas impressoras por terminal

---

## 📞 Referência Rápida

**Arquivo Principal**: `frontend/src/utils/printer.ts`
**Configuração**: `PRINTER_CONFIG` objeto
**Estilo CSS**: `getPrintStyles()` função
**Função de Impressão**: `printReceipt()` função

**Para Adicionar Nova Impressão:**
1. Importe `printReceipt` e `formatCurrency` do utils/printer
2. Crie conteúdo HTML usando classes `.print-*`
3. Chame `printReceipt({ title, subtitle, content })`

---

**Data de Implementação**: Janeiro de 2026  
**Versão**: 1.0  
**Status**: ✅ Completo e Testado
