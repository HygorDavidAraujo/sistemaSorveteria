# ✅ Checklist de Implementação - Novos Campos de Cliente

**Data:** 5 de Janeiro de 2026  
**Status:** Migration criada e pronta para executar

---

## 🎯 Fases de Implementação

### Fase 1: Database ✅ CONCLUÍDA
- [x] Schema Prisma atualizado
- [x] Enums criados (Gender, CustomerType, CustomerCategory)
- [x] 7 novos campos adicionados ao modelo Customer
- [x] 2 índices criados para performance
- [x] Migration SQL gerada: `20260105233505_add_customer_extended_fields`
- [x] Prisma Client regenerado

### Fase 2: Backend (A Fazer)

#### 2.1 Validators
- [ ] Atualizar `backend/src/presentation/validators/customer.validator.ts`
  - [ ] Adicionar validação para `birthDate` (Date válida)
  - [ ] Adicionar enum `gender` ao schema
  - [ ] Adicionar enum `customerType` ao schema
  - [ ] Adicionar boolean `acceptsMarketing`
  - [ ] Adicionar string `preferredContactMethod`
  - [ ] Adicionar enum `customerCategory` ao schema

#### 2.2 DTOs
- [ ] Atualizar `backend/src/application/use-cases/customers/customer.service.ts`
  - [ ] Adicionar novos campos à `CreateCustomerDTO`
  - [ ] Adicionar novos campos à `UpdateCustomerDTO`

#### 2.3 Services
- [ ] Lógica de auto-categorização baseada em histórico
  - [ ] `new`: 0 compras
  - [ ] `occasional`: 1-2 compras
  - [ ] `regular`: 3-9 compras
  - [ ] `frequent`: 10+ compras
  - [ ] `vip`: 50+ compras OU cashback > R$500
- [ ] Atualizar `lastAccessAt` a cada acesso
- [ ] Validar CPF/CNPJ conforme `customerType`

#### 2.4 Controllers
- [ ] Atualizar `backend/src/presentation/http/controllers/customer.controller.ts`
  - [ ] Incluir novos campos nas respostas
  - [ ] Atualizar documentação de endpoints

#### 2.5 Routes
- [ ] Atualizar `backend/src/presentation/http/routes/customer.routes.ts`
  - [ ] Validação automática de novos campos

### Fase 3: Frontend (A Fazer)

#### 3.1 Components
- [ ] Atualizar `frontend/src/components/CustomerForm.tsx` (se existir)
  - [ ] Adicionar input para Data de Nascimento
  - [ ] Adicionar select para Gênero
  - [ ] Adicionar select para Tipo de Cliente
  - [ ] Adicionar checkbox para Aceita Marketing
  - [ ] Adicionar select para Método de Contato Preferido

#### 3.2 Pages
- [ ] Atualizar `frontend/src/pages/CustomersPage.tsx`
  - [ ] Exibir categoria do cliente na tabela
  - [ ] Exibir último acesso (human-readable)
  - [ ] Filtro por categoria
  - [ ] Filtro por tipo de cliente

#### 3.3 Services
- [ ] Atualizar `frontend/src/services/api/customer.service.ts`
  - [ ] Incluir novos campos nos DTOs

### Fase 4: Funcionalidades (A Fazer)

#### 4.1 Auto-Categorização
- [ ] Implementar regra de categorização automática
  - Disparar ao criar cliente
  - Disparar em cada compra
  - Webhook/scheduled job para recalcular

#### 4.2 Rastreamento de Atividade
- [ ] Middleware para atualizar `lastAccessAt`
- [ ] Considerar performance (não atualizar a cada request)

#### 4.3 Preferências de Contato
- [ ] Sistema de notificação respeita `acceptsMarketing`
- [ ] Sistema de notificação usa `preferredContactMethod`

#### 4.4 Relatórios
- [ ] Relatório de clientes por categoria
- [ ] Relatório de clientes por tipo (PF/PJ)
- [ ] Relatório de consentimento de marketing
- [ ] Relatório de clientes inativos

### Fase 5: Testes (A Fazer)

#### 5.1 Unitários
- [ ] Testes para categorização de clientes
- [ ] Testes para validação de tipo de cliente

#### 5.2 Integração
- [ ] Testes de criar cliente com novos campos
- [ ] Testes de atualizar categoria
- [ ] Testes de filtro por categoria

#### 5.3 E2E
- [ ] Fluxo completo de criação com dados demográficos
- [ ] Fluxo de edição de preferências

---

## 📝 SQL de Exemplo

### Criar cliente com todos os novos campos
```sql
INSERT INTO customers (
  name, email, cpf, 
  birth_date, gender, customer_type,
  accepts_marketing, preferred_contact_method,
  customer_category, is_active, created_at
) VALUES (
  'João Silva', 'joao@example.com', '123.456.789-00',
  '1990-05-15', 'male', 'pf',
  true, 'whatsapp',
  'new', true, NOW()
);
```

### Buscar clientes VIP
```sql
SELECT * FROM customers 
WHERE customer_category = 'vip'
ORDER BY total_purchases DESC;
```

### Clientes inativos (últimos 30 dias)
```sql
SELECT * FROM customers 
WHERE last_access_at < NOW() - INTERVAL '30 days'
AND is_active = true
ORDER BY last_access_at ASC;
```

### Estatísticas por categoria
```sql
SELECT 
  customer_category,
  COUNT(*) as total,
  AVG(total_purchases) as avg_purchases,
  SUM(total_purchases) as sum_purchases
FROM customers
WHERE is_active = true
GROUP BY customer_category
ORDER BY total DESC;
```

---

## 🔄 Relacionamentos Impactados

Nenhum relacionamento existente é quebrado. Os seguintes modelos usam `Customer`:
- `Sale` (customer_id)
- `Comanda` (customer_id)
- `DeliveryOrder` (customer_id)
- `AccountReceivable` (customer_id)
- `CashbackTransaction` (customer_id)
- `LoyaltyTransaction` (customer_id)
- `CouponUsage` (customer_id)

Todos continuam funcionando normalmente.

---

## 🚨 Considerações de Performance

### ✅ Índices Criados
- `idx_customers_category`: Otimiza filtros por categoria
- `idx_customers_last_access`: Otimiza queries de inativos

### ⏱️ Impacto de Atualizar `lastAccessAt`
- **Problema:** Atualizar em cada request é caro (writes)
- **Solução:** Usar trigger ou job assíncrono
- **Alternativa:** Atualizar apenas 1x por hora/dia

### 💾 Espaço de Armazenamento
- `birth_date`: 4 bytes
- `gender`: 1-10 bytes (enum)
- `customer_type`: 1-10 bytes (enum)
- `accepts_marketing`: 1 byte
- `preferred_contact_method`: até 50 bytes
- `last_access_at`: 8 bytes
- `customer_category`: 1-10 bytes (enum)
- **Total por registro:** ~100 bytes (mínimo)

---

## 🎓 Guias de Implementação

### TypeScript com Novos Campos
```typescript
import { Customer, Gender, CustomerType, CustomerCategory } from '@prisma/client';

const newCustomer: Customer = await prisma.customer.create({
  data: {
    name: 'João Silva',
    email: 'joao@example.com',
    cpf: '123.456.789-00',
    birthDate: new Date('1990-05-15'),
    gender: Gender.male,
    customerType: CustomerType.pf,
    acceptsMarketing: true,
    preferredContactMethod: 'whatsapp',
    customerCategory: CustomerCategory.new,
  },
});
```

### Categorização Automática
```typescript
function categorizeCustomer(purchaseCount: number, totalSpent: number): CustomerCategory {
  if (totalSpent > 500) return 'vip';
  if (purchaseCount >= 10) return 'frequent';
  if (purchaseCount >= 3) return 'regular';
  if (purchaseCount >= 1) return 'occasional';
  return 'new';
}
```

---

## 📊 Estimativa de Esforço

| Fase | Tempo | Prioridade |
|------|-------|-----------|
| Database | ✅ Feito | - |
| Validators | 1h | Alta |
| Services | 2h | Alta |
| Controllers | 1h | Alta |
| Frontend | 2-3h | Média |
| Auto-categorização | 2h | Média |
| Rastreamento | 1h | Média |
| Testes | 3h | Baixa |
| **Total** | **~12-13h** | - |

---

## ✅ Aprovações e Validações

- [x] Schema validado
- [x] Enums definidos corretamente
- [x] Migration SQL gerada
- [x] Prisma Client regenerado
- [x] Sem breaking changes
- [x] Índices otimizados
- [ ] Banco de dados atualizado (aguardando database)
- [ ] Código backend implementado
- [ ] Código frontend implementado
- [ ] Testes passando
- [ ] Documentação atualizada

---

**Criado:** 5 de Janeiro de 2026  
**Migration:** `20260105233505_add_customer_extended_fields`  
**Versão:** 1.0
