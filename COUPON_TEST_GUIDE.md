# Teste de Cupom - Instruções Passo a Passo

## Problema Identificado e Corrigido

### Erro Original
```
POST http://localhost:3000/api/v1/coupons/validate 422 (Unprocessable Entity)
ID do cliente deve ser um UUID válido
```

### Causa
1. **Sem cliente**: O schema exigia `customerId` como UUID válido, mas frontend passava string vazia `''`
2. **Com cliente**: Possível cupom inexistente ou outro problema na validação

### Solução Implementada

**Backend** - `coupon.validator.ts`:
```typescript
// ANTES
customerId: uuid.required().messages({...})

// DEPOIS
customerId: uuid.optional().allow('').messages({...})
```

Agora `customerId` é **opcional** e pode ser vazio, ou se preenchido, deve ser um UUID válido.

**Frontend** - Ambas as páginas agora validam:
```typescript
if (!selectedCustomer) {
  setError('Selecione um cliente para aplicar o cupom');
  return;
}
```

## Pré-requisitos para Teste

1. ✅ Backend compilando sem erros
2. ✅ Frontend compilando sem erros
3. ✅ Servidor backend rodando na porta 3000
4. ✅ Servidor frontend rodando na porta 5173

## Teste 1: Criar Cupom

### Via Interface
1. Acesse o sistema em `http://localhost:5173`
2. Faça login com credenciais de admin
3. Vá para **Cupons**
4. Clique em **Novo Cupom**
5. Preencha:
   - **Código**: `INDICA20%OFF`
   - **Descrição**: `Cupom de indicação 20% OFF`
   - **Tipo**: `Percentual`
   - **Desconto**: `20`
   - **Valor Mínimo**: `0.00`
   - **Limite de Uso**: `1000`
   - **Válido de**: Data atual ou anterior
   - **Válido até**: Data futura
6. Clique **Salvar**

### Via API (curl)
```bash
curl -X POST http://localhost:3000/api/v1/coupons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "INDICA20%OFF",
    "description": "Cupom de indicacao 20% OFF",
    "couponType": "percentage",
    "discountValue": 20,
    "minPurchaseValue": 0,
    "usageLimit": 1000,
    "validFrom": "2026-01-01T00:00:00Z",
    "validTo": "2026-12-31T23:59:59Z"
  }'
```

## Teste 2: Validar Cupom no Delivery

1. Acesse **Delivery** em `http://localhost:5173`
2. **Adicione produtos** ao carrinho (mínimo R$ 1.00)
3. **Selecione um cliente** na seção "Cliente"
4. **Selecione um endereço** de entrega
5. **Localize a seção "Cupom de Desconto"** (abaixo do campo Desconto)
6. **Digite**: `INDICA20%OFF`
7. **Clique**: Botão verde "Aplicar"

### Resultado Esperado
- ✅ Mensagem verde: "Cupom INDICA20%OFF aplicado com sucesso!"
- ✅ Campo de cupom fica desabilitado
- ✅ Botão "Aplicar" vira botão vermelho "✕"
- ✅ Nova linha aparece nos totais: "Desconto Cupom (INDICA20%OFF): -R$ X.XX"
- ✅ Total é recalculado automaticamente

### Resultado com Erro
Se receber erro, verifique:
- ❌ Cupom existe? → Criar cupom conforme Teste 1
- ❌ Cupom está ativo? → Verificar status no cadastro
- ❌ Cupom expirou? → Verificar datas de validade
- ❌ Valor mínimo? → Adicionar mais produtos
- ❌ Cliente selecionado? → Selecionar cliente

## Teste 3: Validar Cupom nas Comandas

1. Acesse **Comandas** em `http://localhost:5173`
2. **Crie ou abra uma comanda** existente
3. **Adicione produtos** ao carrinho (mínimo R$ 1.00)
4. **Selecione um cliente** na seção "Cliente"
5. **Localize o campo "Cupom de Desconto"** (abaixo do campo Desconto)
6. **Digite**: `INDICA20%OFF`
7. **Clique**: Botão verde "Aplicar"

### Resultado Esperado
- ✅ Mensagem verde: "Cupom INDICA20%OFF aplicado com sucesso!"
- ✅ Campo de cupom fica desabilitado
- ✅ Botão "Aplicar" vira botão vermelho "✕"
- ✅ Nova linha aparece: "Desconto Cupom (INDICA20%OFF): - R$ X.XX"
- ✅ Total da comanda é recalculado

## Teste 4: Remover Cupom

1. Após aplicar o cupom (Testes 2 ou 3)
2. **Clique no botão vermelho "✕"**

### Resultado Esperado
- ✅ Mensagem: "Cupom removido"
- ✅ Linha de desconto desaparece
- ✅ Campo de cupom volta a ficar habilitado
- ✅ Botão volta a ser "Aplicar"
- ✅ Total volta ao valor sem desconto

## Teste 5: Validações de Erro

### 5.1: Sem Cliente
**Ação**: Tente aplicar cupom SEM selecionar cliente
**Erro Esperado**: "Selecione um cliente para aplicar o cupom"

### 5.2: Cupom Inexistente
**Ação**: Tente aplicar cupom com código: `INVALIDO123`
**Erro Esperado**: "Cupom não encontrado"

### 5.3: Cupom Expirado
**Ação**: Se houver cupom com data de validade passada
**Erro Esperado**: "Cupom expirado"

### 5.4: Valor Mínimo Não Atingido
**Ação**: Defina cupom com valor mínimo alto, adicione poucos produtos
**Erro Esperado**: "Valor mínimo de compra é R$ X.XX"

### 5.5: Limite de Uso Atingido
**Ação**: Se cupom com limite baixo foi usado muitas vezes
**Erro Esperado**: "Cupom atingiu limite de uso"

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `backend/src/presentation/validators/coupon.validator.ts` | Tornar `customerId` opcional no `validateCouponSchema` |
| `frontend/src/pages/DeliveryPage.tsx` | Adicionada validação de cliente no `handleApplyCoupon` |
| `frontend/src/pages/ComandasPage.tsx` | Adicionada validação de cliente no `handleApplyCoupon` |
| `frontend/src/services/api.ts` | Atualizado `validateCoupon()` para enviar parâmetros corretos |

## Checklist Final

- [ ] Backend compila sem erros
- [ ] Frontend compila sem erros
- [ ] Servidor backend rodando
- [ ] Servidor frontend rodando
- [ ] Cupom `INDICA20%OFF` criado
- [ ] Teste 1 (Criar Cupom): ✅ Passed
- [ ] Teste 2 (Delivery): ✅ Passed
- [ ] Teste 3 (Comandas): ✅ Passed
- [ ] Teste 4 (Remover Cupom): ✅ Passed
- [ ] Teste 5 (Validações): ✅ All Passed

## Status

✅ **PRONTO PARA TESTE**

Todas as correções foram implementadas e compiladas com sucesso.
