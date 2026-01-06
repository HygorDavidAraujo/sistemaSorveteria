# 📋 Nova Migration: Campos Estendidos do Cliente

**Data:** 5 de Janeiro de 2026  
**Migration ID:** `20260105233505_add_customer_extended_fields`  
**Status:** ✅ Criada e pronta para executar

---

## 📝 Resumo

Adiciona 7 novos campos ao modelo `Customer` para enriquecer o cadastro de clientes com informações demográficas, preferências de contato e categorização.

---

## 🆕 Campos Adicionados

### 1. **birthDate** (Data de Nascimento)
- **Tipo:** `Date`
- **Mapa:** `birth_date`
- **Obrigatório:** Não
- **Padrão:** NULL
- **Uso:** Cálculo de idade, promoções por aniversário

### 2. **gender** (Gênero)
- **Tipo:** `Gender` (enum)
- **Valores:** `male`, `female`, `other`, `not_specified`
- **Obrigatório:** Não
- **Padrão:** NULL
- **Uso:** Personalização de marketing

### 3. **customerType** (Tipo de Cliente)
- **Tipo:** `CustomerType` (enum)
- **Valores:** `pf` (Pessoa Física), `pj` (Pessoa Jurídica)
- **Obrigatório:** Sim
- **Padrão:** `'pf'`
- **Uso:** Diferenciação de tipos de clientes

### 4. **acceptsMarketing** (Aceita Marketing)
- **Tipo:** `Boolean`
- **Mapa:** `accepts_marketing`
- **Obrigatório:** Sim
- **Padrão:** `true`
- **Uso:** Consentimento para comunicação de marketing/newsletter

### 5. **preferredContactMethod** (Método de Contato Preferido)
- **Tipo:** `String` (VARCHAR 50)
- **Mapa:** `preferred_contact_method`
- **Obrigatório:** Não
- **Valores Sugeridos:** `whatsapp`, `email`, `phone`, `sms`
- **Padrão:** NULL
- **Uso:** Respeitar preferência de contato do cliente

### 6. **lastAccessAt** (Último Acesso)
- **Tipo:** `DateTime` (TIMESTAMPTZ)
- **Mapa:** `last_access_at`
- **Obrigatório:** Não
- **Padrão:** NULL
- **Uso:** Rastrear atividade do cliente para análise

### 7. **customerCategory** (Categoria do Cliente)
- **Tipo:** `CustomerCategory` (enum)
- **Valores:** `new`, `occasional`, `regular`, `frequent`, `vip`
- **Obrigatório:** Sim
- **Padrão:** `'new'`
- **Uso:** Segmentação e ofertas personalizadas

---

## 📊 Enums Criados

### `Gender`
```sql
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'not_specified');
```

### `CustomerType`
```sql
CREATE TYPE "CustomerType" AS ENUM ('pf', 'pj');
```

### `CustomerCategory`
```sql
CREATE TYPE "CustomerCategory" AS ENUM ('new', 'occasional', 'regular', 'frequent', 'vip');
```

---

## 🔍 Índices Adicionados

### 1. `idx_customers_category`
```sql
CREATE INDEX "idx_customers_category" ON "customers"("customer_category");
```
- **Otimiza:** Queries de segmentação por categoria

### 2. `idx_customers_last_access`
```sql
CREATE INDEX "idx_customers_last_access" ON "customers"("last_access_at");
```
- **Otimiza:** Queries de clientes inativos/ativos recentes

---

## 🗄️ Alterações no Banco

### Tabela: `customers`

**Novos Campos:**
| Campo | Tipo | Obrigatório | Padrão |
|-------|------|-------------|--------|
| `birth_date` | DATE | Não | NULL |
| `gender` | Gender | Não | NULL |
| `customer_type` | CustomerType | Sim | 'pf' |
| `accepts_marketing` | BOOLEAN | Sim | true |
| `preferred_contact_method` | VARCHAR(50) | Não | NULL |
| `last_access_at` | TIMESTAMPTZ(6) | Não | NULL |
| `customer_category` | CustomerCategory | Sim | 'new' |

---

## 🔄 Compatibilidade

### ✅ Compatível com Código Existente
- Todos os campos são opcionais (exceto `customerType` e `customerCategory`)
- Valores padrão garantem que registros existentes funcionem normalmente
- Não quebra relações existentes

### ✅ Geração de Cliente Prisma
- Prisma Client regenerado com sucesso
- Novos tipos disponíveis em `@prisma/client`

---

## 📋 Como Usar nos Serviços

### Criação com Novos Campos
```typescript
const customer = await prisma.customer.create({
  data: {
    name: 'João Silva',
    email: 'joao@example.com',
    cpf: '123.456.789-00',
    birthDate: new Date('1990-05-15'),
    gender: 'male',
    customerType: 'pf',
    acceptsMarketing: true,
    preferredContactMethod: 'whatsapp',
    customerCategory: 'new',
    // ... outros campos
  },
});
```

### Atualização de Categoria
```typescript
await prisma.customer.update({
  where: { id: customerId },
  data: {
    customerCategory: 'regular',
    lastAccessAt: new Date(),
  },
});
```

### Busca por Categoria
```typescript
const vipCustomers = await prisma.customer.findMany({
  where: {
    customerCategory: 'vip',
  },
});
```

### Clientes Inativos
```typescript
const inactiveCustomers = await prisma.customer.findMany({
  where: {
    lastAccessAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    },
  },
});
```

---

## 🚀 Próximos Passos

### 1. Executar Migration (quando banco estiver disponível)
```bash
npx prisma migrate deploy
```

### 2. Atualizar Controllers
- `customer.controller.ts`: Incluir novos campos na validação

### 3. Atualizar Validators
- `customer.validator.ts`: Adicionar schemas para novos campos

### 4. Atualizar Services
- `customer.service.ts`: Implementar lógica de categorização automática

### 5. Implementar Funcionalidades
- [ ] Auto-categorização baseada em histórico de compras
- [ ] Atualizar `lastAccessAt` em cada acesso
- [ ] Validação de CPF/CNPJ conforme `customerType`
- [ ] Notificações respeitando `acceptsMarketing` e `preferredContactMethod`

---

## 📊 Estrutura Atual do Cliente

```prisma
model Customer {
  // Identificação
  id UUID (PK)
  name VARCHAR(255)
  email VARCHAR(255)
  cpf VARCHAR(14) UNIQUE
  
  // Contato
  phone VARCHAR(20)
  whatsapp VARCHAR(20)
  
  // Endereço (desnormalizado)
  street, number, complement, neighborhood
  city, state, zipCode, referencePoint
  
  // Demografia (NOVO)
  birthDate DATE
  gender Gender
  customerType CustomerType
  
  // Preferências (NOVO)
  acceptsMarketing BOOLEAN
  preferredContactMethod VARCHAR(50)
  
  // Atividade (NOVO)
  lastAccessAt TIMESTAMPTZ
  
  // Categorização (NOVO)
  customerCategory CustomerCategory
  
  // Métricas
  totalPurchases DECIMAL(10,2)
  purchaseCount INTEGER
  loyaltyPoints INTEGER
  cashbackBalance DECIMAL(10,2)
  totalCashbackEarned DECIMAL(10,2)
  
  // Auditoria
  createdAt, updatedAt, createdById
  isActive BOOLEAN
}
```

---

## ✅ Verificação

- ✅ Schema Prisma atualizado
- ✅ Enums criados (Gender, CustomerType, CustomerCategory)
- ✅ Campos adicionados ao modelo Customer
- ✅ Índices criados para otimização
- ✅ Prisma Client regenerado
- ✅ Migration SQL pronta
- ✅ Compatível com código existente

---

**Status:** Pronta para deploy  
**Data de Criação:** 5 de Janeiro de 2026  
**Versão:** 1.0
