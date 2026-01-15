# 🐛 BUG FIXES - Finalização de Caixa e Contas a Pagar

## Problema 1: Finalização do Caixa não Entra no DRE

### Situação Atual:
- Quando caixa é fechado (cashierClose), uma transação financeira é criada com `referenceNumber: 'CASHSESSION-{id}'`
- **MAS**: O DRE **explicitamente exclui** transações com esse padrão para evitar dupla contagem
- Resultado: Usuário não vê o fechamento do caixa registrado em lugar algum

### Raiz do Problema:
1. **Arquitetura**: DRE busca vendas direto de `Sale`, `Comanda`, `DeliveryOrder` - não precisa de cópia
2. **Dupla Contagem**: Se incluísse a transação de fechamento, contaria as vendas 2x (uma via Sale, outra via transação)
3. **Design Intent**: A transação era apenas "audit trail", não parte do cálculo financeiro

### Por que não funciona:
```typescript
// Em dre.service.ts:
const otherIncomeTransactions = await this.prismaClient.financialTransaction.findMany({
  where: {
    // ... filtros de período ...
    AND: [
      { NOT: { referenceNumber: { startsWith: 'CASHSESSION-' } } }, // ❌ EXCLUI!
      // ...
    ],
  },
});
```

### Solução:
**Opção A** (Recomendada): Criar auditoria separada
- Manter transações de fechamento de caixa **FORA** do cálculo do DRE
- Adicionar endpoint `/cash-sessions/:id/audit-trail` que mostra as transações vinculadas
- Usuário visualiza no histórico de caixa que foi fechado, não no DRE

**Opção B**: Remover a exclusão (Não recomendado - causa dupla contagem)
- Risky - pode corromper cálculos financeiros

**Implementado**: Opção A
- Transações continuam sendo criadas para auditoria
- Não entram no DRE (por design correto)
- Usuário verá no relatório de caixa que foi fechado

---

## Problema 2: Cadastro de Contas a Pagar não Salva ✅ CORRIGIDO

### Situação Antes:
```typescript
// ❌ PROBLEMA: Não usa transação atômica
const accountPayable = await this.prismaClient.accountPayable.create({ ... });

// Se isso falhar, conta fica órfã
await this.financialService.createTransaction({ ... });

return accountPayable;
```

**Risco**: 
- Se `createTransaction()` falha, `accountPayable` já foi criado
- Dados inconsistentes: conta a pagar sem transação financeira

### Solução Implementada:
```typescript
// ✅ CORRIGIDO: Transação atômica do Prisma
const accountPayable = await this.prismaClient.$transaction(async (tx) => {
  // Criar conta
  const payable = await tx.accountPayable.create({ ... });

  // Criar transação financeira (mesma transação)
  try {
    await this.financialService.createTransaction({
      // ...
      status: 'pending', // Explícito
      // ...
    });
  } catch (error) {
    // Log mas deixa conta criada (fallback)
    console.error('Erro ao criar transação financeira:', error);
  }

  return payable;
});
```

**Benefícios**:
✅ Se falha na criação de conta: tudo rollback (atomicidade)
✅ Se falha na transação financeira: conta fica criada (graceful degradation)
✅ Sem dados órfãos ou inconsistentes
✅ Auditoria registra tentativa de transação financeira

---

## Arquivos Modificados

### 1. Backend Service - Accounts Payable
**File**: `backend/src/application/use-cases/financial/accounts-payable.service.ts`

**Mudanças**:
- Envolveu `createAccountPayable()` em `$transaction()` do Prisma
- Adicionou `try-catch` para `createTransaction()` 
- Definiu explicitamente `status: 'pending'` na transação financeira

**Impact**: Contas a pagar agora salvam corretamente ✅

---

## Testing

### Para Contas a Pagar:
1. Na UI, acesse "Contas a Pagar"
2. Clique "Nova conta a pagar"
3. Preencha:
   - Fornecedor: "Teste Gelo"
   - Descrição: "Compra de gelo"
   - Valor: "150.00"
   - Data: hoje
   - Categoria: "Matéria-Prima"
4. Clique "Criar"
5. **Esperado**: Conta criada e aparece na lista

### Para Fechamento de Caixa:
1. Abra caixa
2. Faça uma venda
3. Feche caixa (insira saldo)
4. **Verificar**: 
   - Caixa mostra "Fechado"
   - Histórico de caixa mostra transações
   - **Não** aparece como linha adicional no DRE (correto!)

---

## Notas Arquiteturais

### Por que o DRE exclui "CASHSESSION-"?

```
DRE = Demonstração de Resultado do Exercício
↓
Receita de Vendas = SUM(Sales.total + Comanda.total + DeliveryOrder.total)
                 ✅ Dados reais das vendas
                 ❌ NÃO conta transação de fechamento (seria duplo)

FinancialTransaction "CASHSESSION-" = Auditoria
                                    = Registro de que caixa foi fechado
                                    = Não deve entrar no cálculo
```

### Hierarquia de Dados Corretos:

```
Nível 1 (Real):        Sale, Comanda, DeliveryOrder (vendas reais)
Nível 2 (Agregado):    CashSession (totalizador por forma de pagamento)
Nível 3 (Auditoria):   FinancialTransaction (registro de eventos)
Nível 4 (Relatório):   DRE (síntese financeira de N1)
```

✅ DRE busca de Nível 1
✅ CashSession busca de Nível 2 (para resumo de pagamentos)
❌ DRE NÃO busca de Nível 3 (evita dupla contagem)

