# Correção do Sistema de Cupons e Adição nos Carrinhos

## Problema Relatado
- **Erro 422** ao aplicar cupom `INDICA20%OFF` no PDV
- **Campo de cupom ausente** nos carrinhos de Comandas e Delivery

## Correções Implementadas

### 1. Backend - Validação de Cupons (`coupon.validator.ts`)

**Problema**: O schema Joi não tinha pattern explícito, mas o código com `%` poderia estar sendo bloqueado por validação implícita.

**Solução**: Adicionado pattern regex explícito que aceita letras, números, `%`, `_` e `-`:

```typescript
// createCouponSchema
code: Joi.string().min(3).max(50).pattern(/^[A-Za-z0-9%_-]+$/).required()

// validateCouponSchema  
code: Joi.string().pattern(/^[A-Za-z0-9%_-]+$/).required()
```

### 2. Frontend - API Client (`api.ts`)

**Problema**: O método `validateCoupon` não enviava `subtotal` e `customerId` requeridos pelo backend.

**Solução**: Atualizado para enviar todos os parâmetros obrigatórios:

```typescript
async validateCoupon(code: string, subtotal?: number, customerId?: string) {
  const response = await this.client.post('/coupons/validate', { 
    code,
    subtotal: subtotal || 0,
    customerId: customerId || ''
  });
  return response.data;
}
```

### 3. Frontend - DeliveryPage

**Adicionado**:
- ✅ Estados: `couponCode`, `appliedCoupon`, `couponDiscount`, `isCouponLoading`
- ✅ Funções: `handleApplyCoupon()`, `handleRemoveCoupon()`
- ✅ UI: Campo de input + botão Aplicar/Remover no carrinho
- ✅ Cálculo: Total ajustado para subtrair `couponDiscount`
- ✅ Exibição: Linha "Desconto Cupom (CÓDIGO)" nos totais
- ✅ CSS: Estilos `.delivery-page__cart-coupon-btn` e variantes

**Localização no carrinho**: Entre campo "Desconto (R$)" e "Subtotal"

### 4. Frontend - ComandasPage

**Adicionado**:
- ✅ Estados: `couponCode`, `appliedCoupon`, `couponDiscount`, `isCouponLoading`
- ✅ Funções: `handleApplyCoupon()`, `handleRemoveCoupon()`
- ✅ UI: Campo de input + botão Aplicar/Remover no carrinho
- ✅ Cálculo: `paymentSummary` ajustado para subtrair `couponDiscount`
- ✅ Exibição: Linha "Desconto Cupom (CÓDIGO)" nos totais
- ✅ CSS: Estilos `.comanda-cart-coupon-btn` e variantes
- ✅ Dependência: `couponDiscount` adicionada ao `useMemo` de `paymentSummary`

**Localização no carrinho**: Entre campo "Desconto" e "Totais"

### 5. Estilos CSS

**DeliveryPage.css**:
```css
.delivery-page__cart-coupon-btn {
  padding: 0.4rem 0.8rem;
  background: #10b981;
  color: white;
  /* ... */
}

.delivery-page__cart-coupon-btn--remove {
  background: #ef4444;
  /* ... */
}
```

**ComandasPage.css**:
```css
.comanda-cart-coupon-btn {
  padding: 10px 16px;
  background: var(--color-primary);
  color: white;
  /* ... */
}

.comanda-cart-coupon-btn--remove {
  background: var(--color-danger);
  /* ... */
}
```

## Como Testar

### 1. Criar Cupom de Teste

Use a página de Cupons no sistema ou via API:

```bash
POST /api/v1/coupons
Authorization: Bearer {token}

{
  "code": "INDICA20%OFF",
  "description": "Cupom de indicação 20% OFF",
  "couponType": "percentage",
  "discountValue": 20,
  "minPurchaseValue": 0,
  "usageLimit": 1000,
  "validFrom": "2026-01-01T00:00:00Z",
  "validTo": "2026-12-31T23:59:59Z"
}
```

### 2. Testar no Delivery

1. Acesse **Delivery**
2. Adicione produtos ao carrinho
3. Selecione um cliente
4. Selecione um endereço
5. No campo **"Cupom de Desconto"**, digite: `INDICA20%OFF`
6. Clique em **"Aplicar"**
7. Verifique:
   - Mensagem de sucesso verde
   - Linha "Desconto Cupom (INDICA20%OFF): -R$ X.XX" aparece
   - Total é recalculado corretamente
8. Clique no **✕** para remover o cupom

### 3. Testar nas Comandas

1. Acesse **Comandas**
2. Abra ou selecione uma comanda
3. Adicione produtos
4. No campo **"Cupom de Desconto"**, digite: `INDICA20%OFF`
5. Clique em **"Aplicar"**
6. Verifique:
   - Mensagem de sucesso
   - Linha "Desconto Cupom (INDICA20%OFF)" aparece nos totais
   - Total é recalculado
7. Feche a comanda normalmente

### 4. Validações Esperadas

- ✅ Cupom inexistente → Erro: "Cupom não encontrado"
- ✅ Cupom expirado → Erro: "Cupom expirado"
- ✅ Valor mínimo não atingido → Erro: "Valor mínimo de compra é R$ X.XX"
- ✅ Cupom atingiu limite → Erro: "Cupom atingiu limite de uso"
- ✅ Cliente não selecionado → Erro: "Selecione um cliente para aplicar o cupom"

## Arquivos Modificados

### Backend
- `backend/src/presentation/validators/coupon.validator.ts`

### Frontend
- `frontend/src/services/api.ts`
- `frontend/src/pages/DeliveryPage.tsx`
- `frontend/src/pages/DeliveryPage.css`
- `frontend/src/pages/ComandasPage.tsx`
- `frontend/src/pages/ComandasPage.css`

### Scripts de Teste (criados)
- `test-coupon-percent.ps1`
- `create-coupon-percent.ps1`

## Fluxo Completo

1. **Usuário digita código** → `setCouponCode(valor.toUpperCase())`
2. **Clica "Aplicar"** → `handleApplyCoupon()`
3. **Validação local**: verifica se cliente está selecionado
4. **Chamada API**: `apiClient.validateCoupon(code, subtotal, customerId)`
5. **Backend valida**: status, datas, valor mínimo, limite de uso
6. **Backend calcula**: desconto baseado em tipo (percentage/fixed)
7. **Frontend recebe**: `{code, discountAmount, ...}`
8. **Estados atualizados**: `appliedCoupon`, `couponDiscount`
9. **UI atualizada**: exibe linha de desconto nos totais
10. **Total recalculado**: subtotal + taxas - descontos - cupom

## Observações

- ✅ Cupom só pode ser aplicado se houver cliente selecionado
- ✅ Campo de cupom fica desabilitado após aplicação
- ✅ Botão "Aplicar" vira botão "✕ Remover" após aplicação
- ✅ Desconto do cupom é separado do desconto manual
- ✅ Ambos os descontos são somados no cálculo final
- ✅ Validação no backend garante segurança (não pode burlar frontend)
- ✅ Pattern regex permite `%` e outros caracteres comuns em códigos promocionais

## Status: ✅ CONCLUÍDO

Todas as correções foram implementadas e estão prontas para teste.
