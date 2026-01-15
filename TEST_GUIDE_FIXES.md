# 🧪 GUIA DE TESTE - Fixes Implementados

## Resumo dos Fixes

### ✅ Fix 1: Contas a Pagar agora salvam corretamente
- **Arquivo**: `backend/src/application/use-cases/financial/accounts-payable.service.ts`
- **Tipo**: Bug fix (transações atômicas)
- **Status**: Live em http://localhost:5173

### ✅ Fix 2: DRE exclui corretamente fechamento de caixa
- **Arquivo**: `backend/src/application/use-cases/financial/dre.service.ts`
- **Tipo**: Design confirmado (não é bug)
- **Status**: Documentado em `CASH_SESSION_DRE_EXPLANATION.md`

---

## 🎯 Teste Rápido (5 minutos)

### Passo 1: Testar Criação de Conta a Pagar

**URL**: http://localhost:5173

1. Navegue para: **Financeiro → Contas a Pagar**

2. Clique no botão: **+ Criar Conta a Pagar** (topo direito)

3. Preencha o formulário:
   ```
   Fornecedor: "Distribuidor ABC"
   Descrição: "Compra de gases para máquinas"
   Valor: 250.50
   Data Vencimento: [Hoje + 15 dias]
   Categoria: "Matéria-Prima"
   Notas: "Teste de fix - deve salvar agora"
   ```

4. Clique: **Criar**

5. **Resultado Esperado** ✅
   - Mensagem: "Conta a pagar criada com sucesso"
   - Conta aparece na lista com status "pending"
   - Pode visualizar a conta ao clicar nela

---

### Passo 2: Verificar Transação Financeira

1. Navegue para: **Financeiro → Transações Financeiras**

2. Procure pela descrição:
   ```
   "Conta a Pagar: Compra de gases para máquinas"
   ```

3. **Resultado Esperado** ✅
   - Transação aparece com:
     - Tipo: **Despesa**
     - Status: **pending**
     - Valor: **250.50**
     - Data: Hoje
     - Categoria: **Matéria-Prima**

---

### Passo 3: Testar Fechamento de Caixa

1. Navegue para: **Caixa**

2. Se o caixa estiver aberto:
   - Clique: **Fechar Caixa**
   - Informe saldo: [Saldo Atual + Vendas]
   - Confirme

   Se não estiver aberto:
   - Clique: **Abrir Caixa**
   - Informe saldo inicial: 100.00
   - Faça uma venda rápida (2-3 produtos)
   - Clique: **Fechar Caixa**
   - Informe saldo: 100.00 + valor das vendas

3. **Resultado Esperado** ✅
   - Status muda para: **Fechado**
   - Aparece data/hora de fechamento
   - Caixa entra no histórico

---

### Passo 4: Verificar DRE

1. Navegue para: **Financeiro → DRE**

2. Configure filtro:
   ```
   Data Inicial: Hoje
   Data Final: Hoje
   ```

3. Clique: **Gerar Relatório**

4. **Resultado Esperado** ✅
   ```
   RECEITA BRUTA:
     - Vendas: R$ [valor do que vendeu]
       ❌ NÃO mostra fechamento como linha adicional (correto!)
   
   DESPESAS:
     - Se criou conta a pagar: aparece aqui
   
   LUCRO LÍQUIDO:
     - Receita - Despesas
   ```

---

## 🔍 Verificação Técnica (Avançado)

### Via API (se tiver client REST)

#### 1. Listar Contas a Pagar
```http
GET http://localhost:3000/api/v1/financial/accounts-payable
Authorization: Bearer [SEU_TOKEN]
```

#### 2. Listar Transações Financeiras
```http
GET http://localhost:3000/api/v1/financial/transactions
Authorization: Bearer [SEU_TOKEN]
```

#### 3. Gerar DRE
```http
GET http://localhost:3000/api/v1/dre?startDate=2026-01-15&endDate=2026-01-15
Authorization: Bearer [SEU_TOKEN]
```

---

## 🚨 Se Algo Não Funcionar

### Problema: "Conta a Pagar não aparece após criar"

**Solução**:
1. Aguarde 2-3 segundos
2. Atualize a página (F5)
3. Se ainda não aparecer, verifique console (F12 → Network)
4. Procure erro 400/500 na requisição POST

### Problema: "Não vejo transação financeira"

**Solução**:
1. Vá para **Financeiro → Transações Financeiras**
2. Use o filtro para buscar por data
3. Se não aparecer, verifique:
   - Categoria existe e está ativa?
   - Valor é positivo?
   - A transação financeira foi criada?

### Problema: "DRE mostra valores duplicados"

**Solução**:
- Isso **não deveria acontecer** porque CASHSESSION-* é excluído
- Se ver duplo, verifique:
  - Period está correto?
  - Vendas foram feitas no período selecionado?

---

## 📊 Checklist de Validação

Marque após testar cada item:

- [ ] Conta a Pagar criada com sucesso
- [ ] Conta aparece na lista de contas a pagar
- [ ] Transação financeira vinculada existe
- [ ] Transação está com status "pending"
- [ ] DRE mostra despesa sem duplicação
- [ ] Fechamento de caixa registrado
- [ ] Valores do DRE batem com vendas reais

---

## 📞 Relatório de Testes

Após executar os testes, relate:

1. **Contas a Pagar**:
   - [ ] Criou com sucesso?
   - [ ] Transação financeira foi criada?
   - [ ] Aparecem na lista?

2. **DRE**:
   - [ ] Incluiu despesa?
   - [ ] Valores corretos?
   - [ ] Sem duplicação?

3. **Caixa**:
   - [ ] Fechamento registrado?
   - [ ] Aparece no histórico?

---

## 🎯 Success Criteria

✅ **Teste Passou** se:
- Conta a pagar criada → aparece na lista
- Transação financeira criada → vinculada à conta
- DRE calcula despesa → sem dupla contagem com caixa
- Sem erros 400/500 na API

❌ **Teste Falhou** se:
- Conta não aparece após criar
- Transação não é criada
- Erro na API (veja console)
- Valores incorretos no DRE

---

**Data de Teste**: _______________
**Testador**: _______________
**Status Final**: [ ] PASSOU  [ ] FALHOU

