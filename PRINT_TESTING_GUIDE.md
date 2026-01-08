# 🧪 Guia de Testes - Sistema de Impressão

## ✅ Testes de Verificação

### 1. Teste de Formato (Cabe em 80mm?)

#### Teste Visual no PDF

1. **Abra a página** em desenvolvimento (http://localhost:5173)
2. **Clique em "Imprimir"** (Caixa/Comanda/Venda/Delivery)
3. **Salve como PDF** em vez de imprimir
4. **Abra o PDF** e verifique:
   - [ ] Conteúdo cabe na largura
   - [ ] Nenhuma linha cortada
   - [ ] Tabelas alinhadas
   - [ ] Numeração sequencial

#### Teste no Navegador

```javascript
// Abra DevTools (F12) e execute:
const width = document.body.querySelector('body').offsetWidth;
console.log(`Largura atual: ${width}px`);
console.log(`Equivalente a: ${width / 37.8}mm`); // 96 DPI = 37.8 px/mm
```

**Esperado**: ~70mm (265px)

---

### 2. Teste de Legibilidade

#### Fontes

- [ ] Texto principal: 11px - fácil de ler
- [ ] Headers: 13px - destaca bem
- [ ] Detalhes: 9px - legível em boa iluminação
- [ ] Monospace: bem distribuído (sem apertado)

#### Contraste

- [ ] Preto sobre branco: OK
- [ ] Linhas tracejadas: visíveis
- [ ] Negrito: destaca
- [ ] Seções: bem delimitadas

---

### 3. Teste de Conteúdo

#### Caixa (Fechamento)

```javascript
// Teste a função
handlePrintClosingReceipt({
  terminalId: 'TERMINAL_01',
  openedBy: { fullName: 'João Silva' },
  openedAt: new Date(Date.now() - 8*3600000).toISOString(),
  closedAt: new Date().toISOString(),
  initialCash: 100,
  totalSales: 1250.50,
  totalCash: 500,
  totalCard: 600,
  totalPix: 150.50,
}, 600);
```

**Verificar:**
- [ ] Título: FECHAMENTO DE CAIXA
- [ ] Terminal ID
- [ ] Nomes do operador
- [ ] Datas abertura/fechamento
- [ ] Todos os valores monetários
- [ ] Linhas para assinatura

---

#### Comandas (Pré-Conta)

```javascript
// Simule uma comanda no estado
const mockComanda = {
  comandaNumber: 5,
  tableNumber: '02',
  customerName: 'Cliente XYZ',
  items: [
    { productName: 'Açaí com Granola', quantity: 1, unitPrice: 15, subtotal: 15 },
    { productName: 'Sorvete Baunilha', quantity: 2, unitPrice: 9, subtotal: 18 },
  ],
  subtotal: 33,
  discount: 3,
  total: 30
};

// Trigger a impressão
handlePrintPreBill();
```

**Verificar:**
- [ ] Número da comanda
- [ ] Mesa
- [ ] Cliente
- [ ] Tabela com itens
- [ ] Cálculos corretos
- [ ] Marca "Documento não fiscal"

---

#### Vendas (Pré-Conta PDV)

```javascript
// Teste com carrinho contendo itens
// Adicione itens e execute:
handlePrintPreview();
```

**Verificar:**
- [ ] Título: PRÉ-CONTA
- [ ] Cliente
- [ ] Data/Hora
- [ ] Tabela com itens
- [ ] Subtotal, desconto, total
- [ ] Formas de pagamento (se preenchidas)
- [ ] Troco/Falta (se aplicável)

---

#### Delivery (Pedido)

```javascript
// Teste com um pedido
const mockOrder = {
  orderNumber: 123,
  orderedAt: new Date().toISOString(),
  customer: {
    name: 'Maria Silva',
    phone: '(11) 98765-4321',
    street: 'Rua das Flores',
    number: '456',
    complement: 'Ap 789',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01010-001',
    referencePoint: 'Próximo ao parque'
  },
  items: [
    { productName: 'Açaí com Granola', quantity: 2, subtotal: 30 }
  ],
  subtotal: 30,
  deliveryFee: 5,
  discount: 0,
  total: 35,
  estimatedTime: 30,
  customerNotes: 'Sem açúcar no açaí',
  internalNotes: 'Cliente com alergias'
};

handlePrintOrder(mockOrder);
```

**Verificar:**
- [ ] Badge 🚚 DELIVERY
- [ ] Número do pedido
- [ ] Dados do cliente (nome, telefone)
- [ ] Endereço completo
- [ ] Todos os itens
- [ ] Subtotal, taxa, total
- [ ] Observações
- [ ] Tempo estimado

---

## 🔍 Testes de Impressora Real

### Preparação

1. **Conecte impressora térmica 80mm**
   - Via USB: conexão direta
   - Via Ethernet: configure IP
   - Via Bluetooth: pareie dispositivo

2. **Instale driver apropriado**
   - Zebra: ZD Series
   - Bematech: MP series
   - Star: Micronics
   - Elgin: i9

3. **Configure em Windows**
   - Painel de Controle → Dispositivos e Impressoras
   - Adicionar impressora → Selecione a térmica

---

### Teste Básico

```javascript
// No Console do navegador:
window.print();
// Escolha a impressora térmica
// Verifique as margens
```

**Resultado esperado:**
- Papel sai com margem mínima
- Texto legível
- Sem cortes laterais
- Linhas bem definidas

---

### Teste de Margens

```typescript
// No printer.ts, teste com diferentes margens:
body {
  margin: 0;     // Sem margem (ideal)
  padding: 3mm;  // Pequeno padding
  width: 70mm;   // Exato
}
```

**Executar** `handlePrintClosingReceipt()` e verificar:
- [ ] Conteúdo alinhado à esquerda
- [ ] Espaço em branco mínimo
- [ ] Não corta caracteres
- [ ] Papel não enrola

---

### Teste de Velocidade

```typescript
// Teste impressão contínua
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    handlePrintClosingReceipt(data, 600);
  }, i * 2000);
}
```

**Verificar:**
- [ ] Impressora não congela
- [ ] Sem erro na impressão
- [ ] Qualidade mantida

---

### Teste de Claridade

**Imprima e verifique visualmente:**

| Elemento | Esperado | OK? |
|----------|----------|-----|
| Headers (13px) | Bem destacados | [ ] |
| Texto (11px) | Fácil leitura | [ ] |
| Detalhes (9px) | Legível | [ ] |
| Linhas tracejadas | Visíveis | [ ] |
| Valores monetários | Alinhados | [ ] |
| Borradas de tabela | Claras | [ ] |

---

## 📊 Testes Automáticos (Pseudo)

### Teste de CSS

```javascript
// Verify print styles are loaded
const styles = document.querySelectorAll('style');
const hasPrintStyles = Array.from(styles).some(s => 
  s.textContent.includes('.print-header')
);
console.log('Print styles loaded:', hasPrintStyles);
```

**Esperado:** `true`

---

### Teste de Funções

```javascript
// Verify functions exist
console.log('printReceipt exists:', typeof printReceipt === 'function');
console.log('formatCurrency exists:', typeof formatCurrency === 'function');
console.log('getPrintStyles exists:', typeof getPrintStyles === 'function');
```

**Esperado:** todos `true`

---

### Teste de Formatação

```javascript
// Test currency formatting
import { formatCurrency } from '@/utils/printer';

console.log(formatCurrency(0));      // "R$ 0.00"
console.log(formatCurrency(1250));   // "R$ 1250.00"
console.log(formatCurrency(15.5));   // "R$ 15.50"
console.log(formatCurrency(9.999));  // "R$ 10.00"
```

**Esperado:** formato correto com 2 casas decimais

---

## 🎯 Checklist Final

### Antes de Produção

- [ ] Todas as 4 impressões funcionam
- [ ] Conteúdo cabe em 80mm
- [ ] Fontes legíveis
- [ ] PDF gerado corretamente
- [ ] Impressora reconhece tamanho
- [ ] Nenhum caractere cortado
- [ ] Alinhamento correto
- [ ] Valores monetários OK
- [ ] Datas formatadas corretamente
- [ ] Seções bem delimitadas
- [ ] Footer com informações
- [ ] Marca "Documento não fiscal" (quando aplicável)

### Na Impressora Real

- [ ] Papel alimentado corretamente
- [ ] Velocidade aceitável (< 3s por página)
- [ ] Qualidade de impressão boa
- [ ] Sem margens excessivas
- [ ] Texto sem borrões
- [ ] Linhas bem definidas
- [ ] Trabalho contínuo sem travamentos

---

## 🆘 Testes para Problemas Comuns

### Se Conteúdo Sair Cortado

```typescript
// 1. Verifique a largura
console.log('Body width:', document.body.offsetWidth);

// 2. Reduza fonte
font-size: 10px; // em vez de 11px

// 3. Remova padding
padding: 0;

// 4. Teste margem
margin: 0;
```

---

### Se Impressora Não Reconhece

```typescript
// 1. Teste via terminal (Linux/Mac)
lp -d PRINTER_NAME file.pdf

// 2. Test via PowerShell (Windows)
Get-Printer

// 3. Restart impressora
# Desplugue e replugue
```

---

### Se Fonte Fica Ilegível

```typescript
// Aumente tamanho
font-size: 12px;

// Use negrito
font-weight: bold;

// Aumente espaçamento
line-height: 1.6;
letter-spacing: 1px;
```

---

## 📋 Registro de Testes

Use este template para cada teste realizado:

```markdown
### Teste: [Data] - [Módulo]

**Ambiente:** [Desenvolvimento/Produção]
**Impressora:** [Modelo]
**SO:** [Windows/Mac/Linux]

**Resultados:**
- PDF Generated: [OK/FALHA]
- Formatação: [OK/AJUSTES NECESSÁRIOS]
- Claridade: [BOA/MÉDIA/RUIM]
- Tempo: [segundos]

**Observações:**
[Qualquer nota relevante]

**Status:** [✅ PASSOU / ❌ FALHOU]
```

---

## 🔗 Recursos Adicionais

- [MDN - CSS @page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)
- [MDN - @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_features)
- [Print CSS Guide](https://www.smashingmagazine.com/2015/01/designing-for-print-with-css/)

---

**Versão**: 1.0  
**Data**: Janeiro de 2026  
**Status**: ✅ Pronto para Testes
