# GELATINI - Database Schema
## PostgreSQL Database Design v1.0

---

## 📊 ENTITY RELATIONSHIP OVERVIEW

```
users ──┬──→ cash_sessions ──→ sales ──→ sale_items
        │                        │  ├──→ payments
        │                        │  └──→ sale_adjustments
        │
        └──→ audit_logs

customers ──┬──→ sales
            ├──→ comandas
            ├──→ delivery_orders
            ├──→ loyalty_points
            └──→ loyalty_transactions

products ──┬──→ sale_items
           ├──→ comanda_items
           ├──→ product_costs
           └──→ loyalty_rewards

financial_transactions ──→ financial_categories
```

---

## 🗃️ TABLE DEFINITIONS

### 1. USERS & AUTHENTICATION

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'cashier'
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT role_check CHECK (role IN ('admin', 'manager', 'cashier'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### `permissions`
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL, -- 'sales', 'dre', 'cash_closing', etc
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
  
  UNIQUE(role, resource, action)
);
```

#### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

### 2. CUSTOMERS

#### `customers`
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  cpf VARCHAR(14) UNIQUE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Totalizadores (desnormalizado para performance)
  total_purchases DECIMAL(10,2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_customers_name ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_customers_active ON customers(is_active);
```

#### `customer_addresses`
```sql
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(100), -- 'Casa', 'Trabalho', etc
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20),
  complement VARCHAR(255),
  neighborhood VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  reference_point TEXT,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
```

---

### 3. PRODUCTS

#### `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  sale_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- Para cálculo de CPV
  
  -- Type
  sale_type VARCHAR(20) NOT NULL, -- 'unit' or 'weight'
  unit VARCHAR(20), -- 'un', 'kg', etc
  
  -- Loyalty
  eligible_for_loyalty BOOLEAN DEFAULT false,
  loyalty_points_multiplier DECIMAL(5,2) DEFAULT 1.0,
  
  -- Stock (preparado para futuro)
  track_stock BOOLEAN DEFAULT false,
  current_stock DECIMAL(10,3) DEFAULT 0,
  min_stock DECIMAL(10,3) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT sale_type_check CHECK (sale_type IN ('unit', 'weight')),
  CONSTRAINT positive_price CHECK (sale_price >= 0)
);

CREATE INDEX idx_products_name ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
```

#### `product_costs`
```sql
-- Histórico de custos para cálculo preciso de CPV
CREATE TABLE product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_price DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_product_costs_product ON product_costs(product_id);
CREATE INDEX idx_product_costs_dates ON product_costs(valid_from, valid_to);
```

---

### 4. CASH SESSIONS

#### `cash_sessions`
```sql
CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number SERIAL,
  terminal_id VARCHAR(50), -- Identificação do terminal/computador
  
  -- Opening
  opened_by UUID NOT NULL REFERENCES users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  opening_notes TEXT,
  
  -- Cashier Closing (Nível 1)
  cashier_closed_at TIMESTAMPTZ,
  cashier_closed_by UUID REFERENCES users(id),
  cashier_cash_count DECIMAL(10,2),
  cashier_difference DECIMAL(10,2),
  cashier_notes TEXT,
  
  -- Manager Closing (Nível 2)
  manager_closed_at TIMESTAMPTZ,
  manager_closed_by UUID REFERENCES users(id),
  manager_validated BOOLEAN DEFAULT false,
  manager_notes TEXT,
  
  -- Totals (calculated)
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_cash DECIMAL(10,2) DEFAULT 0,
  total_card DECIMAL(10,2) DEFAULT 0,
  total_pix DECIMAL(10,2) DEFAULT 0,
  total_other DECIMAL(10,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'open',
  
  CONSTRAINT status_check CHECK (status IN ('open', 'cashier_closed', 'manager_closed'))
);

CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_cash_sessions_dates ON cash_sessions(opened_at, manager_closed_at);
CREATE INDEX idx_cash_sessions_terminal ON cash_sessions(terminal_id);
```

#### `cash_session_payments`
```sql
-- Breakdown detalhado por forma de pagamento
CREATE TABLE cash_session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL,
  counted_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  
  CONSTRAINT payment_method_check CHECK (payment_method IN ('cash', 'debit_card', 'credit_card', 'pix', 'other'))
);

CREATE INDEX idx_cash_session_payments_session ON cash_session_payments(cash_session_id);
```

---

### 5. SALES (PDV)

#### `sales`
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number SERIAL,
  
  -- Relationships
  cash_session_id UUID NOT NULL REFERENCES cash_sessions(id),
  customer_id UUID REFERENCES customers(id),
  
  -- Type
  sale_type VARCHAR(20) NOT NULL, -- 'pdv', 'comanda', 'delivery'
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Loyalty
  loyalty_points_used INTEGER DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed',
  
  -- Timestamps
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Audit
  is_adjusted BOOLEAN DEFAULT false,
  adjustment_reason TEXT,
  adjusted_at TIMESTAMPTZ,
  adjusted_by UUID REFERENCES users(id),
  
  CONSTRAINT sale_type_check CHECK (sale_type IN ('pdv', 'comanda', 'delivery')),
  CONSTRAINT status_check CHECK (status IN ('completed', 'cancelled', 'adjusted'))
);

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cash_session ON sales(cash_session_id);
CREATE INDEX idx_sales_type ON sales(sale_type);
CREATE INDEX idx_sales_status ON sales(status);
```

#### `sale_items`
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  product_name VARCHAR(255) NOT NULL, -- Snapshot
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- Para CPV
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Loyalty
  loyalty_points_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

#### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Card specific
  card_brand VARCHAR(50),
  card_last_digits VARCHAR(4),
  installments INTEGER DEFAULT 1,
  
  -- PIX specific
  pix_key VARCHAR(255),
  pix_transaction_id VARCHAR(255),
  
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT payment_method_check CHECK (payment_method IN ('cash', 'debit_card', 'credit_card', 'pix', 'other'))
);

CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(payment_method);
```

#### `sale_adjustments`
```sql
-- Log de ajustes/reaberturas
CREATE TABLE sale_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  
  adjustment_type VARCHAR(50) NOT NULL, -- 'reopening', 'cancellation', 'value_correction'
  reason TEXT NOT NULL,
  
  -- Values before/after
  old_total DECIMAL(10,2),
  new_total DECIMAL(10,2),
  old_data JSONB,
  new_data JSONB,
  
  adjusted_by UUID NOT NULL REFERENCES users(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  
  CONSTRAINT adjustment_type_check CHECK (adjustment_type IN ('reopening', 'cancellation', 'value_correction', 'item_change'))
);

CREATE INDEX idx_sale_adjustments_sale ON sale_adjustments(sale_id);
CREATE INDEX idx_sale_adjustments_date ON sale_adjustments(adjusted_at);
```

---

### 6. COMANDAS

#### `comandas`
```sql
CREATE TABLE comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_number INTEGER NOT NULL,
  
  -- Identification
  table_number VARCHAR(20),
  customer_name VARCHAR(255),
  customer_id UUID REFERENCES customers(id),
  
  -- Cash session
  cash_session_id UUID NOT NULL REFERENCES cash_sessions(id),
  
  -- Amounts
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'open',
  
  -- Timestamps
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  opened_by UUID NOT NULL REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  
  -- Audit
  is_adjusted BOOLEAN DEFAULT false,
  adjustment_reason TEXT,
  
  CONSTRAINT status_check CHECK (status IN ('open', 'closed', 'cancelled')),
  UNIQUE(comanda_number, opened_at)
);

CREATE INDEX idx_comandas_status ON comandas(status);
CREATE INDEX idx_comandas_number ON comandas(comanda_number);
CREATE INDEX idx_comandas_customer ON comandas(customer_id);
CREATE INDEX idx_comandas_date ON comandas(opened_at);
```

#### `comanda_items`
```sql
CREATE TABLE comanda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  subtotal DECIMAL(10,2) NOT NULL,
  
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id),
  
  is_cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT
);

CREATE INDEX idx_comanda_items_comanda ON comanda_items(comanda_id);
CREATE INDEX idx_comanda_items_product ON comanda_items(product_id);
```

#### `comanda_payments`
```sql
CREATE TABLE comanda_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
  
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT payment_method_check CHECK (payment_method IN ('cash', 'debit_card', 'credit_card', 'pix', 'other'))
);

CREATE INDEX idx_comanda_payments_comanda ON comanda_payments(comanda_id);
```

---

### 7. DELIVERY

#### `delivery_orders`
```sql
CREATE TABLE delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  
  -- Customer (obrigatório)
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_address_id UUID NOT NULL REFERENCES customer_addresses(id),
  
  -- Cash session
  cash_session_id UUID NOT NULL REFERENCES cash_sessions(id),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Delivery info
  delivery_status VARCHAR(30) DEFAULT 'received',
  estimated_time INTEGER, -- minutes
  delivery_person VARCHAR(255),
  
  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,
  
  -- Timestamps
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  preparing_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_by UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT delivery_status_check CHECK (
    delivery_status IN ('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')
  )
);

CREATE INDEX idx_delivery_orders_customer ON delivery_orders(customer_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(delivery_status);
CREATE INDEX idx_delivery_orders_date ON delivery_orders(ordered_at);
```

#### `delivery_fees`
```sql
-- Configuração de taxas de entrega por região
CREATE TABLE delivery_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  free_delivery_above DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_fees_location ON delivery_fees(city, neighborhood);
```

---

### 8. LOYALTY PROGRAM

#### `loyalty_config`
```sql
CREATE TABLE loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rules
  points_per_real DECIMAL(5,2) NOT NULL DEFAULT 1, -- 1 ponto por R$ 1
  min_purchase_value DECIMAL(10,2) DEFAULT 0,
  points_expiration_days INTEGER, -- NULL = nunca expira
  
  -- Redemption
  points_to_real_ratio DECIMAL(5,2) NOT NULL DEFAULT 0.01, -- 100 pontos = R$ 1
  min_points_redemption INTEGER DEFAULT 100,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apenas uma config ativa por vez
CREATE UNIQUE INDEX idx_loyalty_config_active ON loyalty_config(is_active) WHERE is_active = true;
```

#### `loyalty_rewards`
```sql
-- Catálogo de recompensas
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  quantity_available INTEGER,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(is_active);
```

#### `loyalty_transactions`
```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  
  transaction_type VARCHAR(30) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjustment'
  points INTEGER NOT NULL, -- positivo ou negativo
  balance_after INTEGER NOT NULL,
  
  -- Reference
  sale_id UUID REFERENCES sales(id),
  reward_id UUID REFERENCES loyalty_rewards(id),
  
  description TEXT,
  
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT transaction_type_check CHECK (
    transaction_type IN ('earn', 'redeem', 'expire', 'adjustment', 'manual')
  )
);

CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_date ON loyalty_transactions(created_at);
CREATE INDEX idx_loyalty_transactions_expires ON loyalty_transactions(expires_at);
```

---

### 9. FINANCIAL MANAGEMENT

#### `financial_categories`
```sql
CREATE TABLE financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  
  category_type VARCHAR(20) NOT NULL, -- 'revenue', 'cost', 'expense'
  
  -- DRE Classification
  dre_group VARCHAR(50), -- 'sales', 'cogs', 'fixed_expenses', 'variable_expenses'
  
  parent_category_id UUID REFERENCES financial_categories(id),
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT category_type_check CHECK (category_type IN ('revenue', 'cost', 'expense'))
);

CREATE INDEX idx_financial_categories_type ON financial_categories(category_type);
```

#### `financial_transactions`
```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Classification
  category_id UUID NOT NULL REFERENCES financial_categories(id),
  
  -- Type
  transaction_type VARCHAR(20) NOT NULL, -- 'revenue', 'expense', 'transfer'
  
  -- Amounts
  amount DECIMAL(10,2) NOT NULL,
  
  -- Description
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  
  -- Dates
  transaction_date DATE NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  
  -- References
  sale_id UUID REFERENCES sales(id),
  comanda_id UUID REFERENCES comandas(id),
  delivery_order_id UUID REFERENCES delivery_orders(id),
  
  -- Tags
  tags TEXT[],
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT transaction_type_check CHECK (transaction_type IN ('revenue', 'expense', 'transfer')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue'))
);

CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
```

#### `accounts_payable`
```sql
CREATE TABLE accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  supplier_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  financial_category_id UUID NOT NULL REFERENCES financial_categories(id),
  
  status VARCHAR(20) DEFAULT 'pending',
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT status_check CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue'))
);

CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
```

#### `accounts_receivable`
```sql
CREATE TABLE accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  received_at TIMESTAMPTZ,
  
  sale_id UUID REFERENCES sales(id),
  
  status VARCHAR(20) DEFAULT 'pending',
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT status_check CHECK (status IN ('pending', 'received', 'cancelled', 'overdue'))
);

CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX idx_accounts_receivable_customer ON accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
```

---

### 10. AUDIT & LOGS

#### `audit_logs`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  
  -- Action
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'cash_opening', etc
  entity_type VARCHAR(100) NOT NULL, -- 'sale', 'cash_session', 'product', etc
  entity_id UUID,
  
  -- Details
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
```

---

## 🔍 VIEWS FOR DRE

### `view_dre_revenue`
```sql
CREATE OR REPLACE VIEW view_dre_revenue AS
SELECT
  DATE_TRUNC('day', sale_date) as period_day,
  DATE_TRUNC('month', sale_date) as period_month,
  sale_type,
  SUM(total) as gross_revenue,
  SUM(discount) as total_discounts,
  SUM(total - discount) as net_revenue,
  COUNT(*) as transaction_count
FROM sales
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', sale_date), DATE_TRUNC('month', sale_date), sale_type;
```

### `view_dre_cogs`
```sql
CREATE OR REPLACE VIEW view_dre_cogs AS
SELECT
  DATE_TRUNC('day', s.sale_date) as period_day,
  DATE_TRUNC('month', s.sale_date) as period_month,
  SUM(si.quantity * COALESCE(si.cost_price, 0)) as total_cogs
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
WHERE s.status = 'completed'
GROUP BY DATE_TRUNC('day', s.sale_date), DATE_TRUNC('month', s.sale_date);
```

### `view_dre_expenses`
```sql
CREATE OR REPLACE VIEW view_dre_expenses AS
SELECT
  DATE_TRUNC('day', transaction_date) as period_day,
  DATE_TRUNC('month', transaction_date) as period_month,
  fc.dre_group,
  fc.name as category_name,
  SUM(amount) as total_amount
FROM financial_transactions ft
JOIN financial_categories fc ON fc.id = ft.category_id
WHERE ft.status = 'paid' AND fc.category_type = 'expense'
GROUP BY DATE_TRUNC('day', transaction_date), DATE_TRUNC('month', transaction_date), fc.dre_group, fc.name;
```

---

## 📈 KEY INDEXES FOR PERFORMANCE

```sql
-- Full-text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Customer search
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm ON customers USING gin(phone gin_trgm_ops);

-- Product search
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Date range queries (for reports)
CREATE INDEX idx_sales_date_range ON sales(sale_date, status);
CREATE INDEX idx_financial_transactions_date_range ON financial_transactions(transaction_date, status);

-- Composite indexes for common queries
CREATE INDEX idx_sales_session_customer ON sales(cash_session_id, customer_id);
CREATE INDEX idx_sale_items_product_date ON sale_items(product_id, created_at);
```

---

## 🔐 ROW LEVEL SECURITY (Future)

```sql
-- Prepared for multi-tenant (multi-store) architecture
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Example policy
CREATE POLICY tenant_isolation ON sales
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

---

## 📊 MATERIALIZED VIEWS FOR DASHBOARD

```sql
-- Daily aggregated metrics (refresh hourly)
CREATE MATERIALIZED VIEW mv_daily_metrics AS
SELECT
  DATE(sale_date) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  AVG(total) as average_ticket,
  COUNT(DISTINCT customer_id) as unique_customers
FROM sales
WHERE status = 'completed'
GROUP BY DATE(sale_date);

CREATE UNIQUE INDEX ON mv_daily_metrics(sale_date);

-- Refresh schedule (via cron or pg_cron)
-- SELECT cron.schedule('refresh_daily_metrics', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics');
```

---

## 🚀 INITIAL DATA SEEDS

### Default Admin User
```sql
INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES ('hygordavidaraujo@gmail.com', '$2b$10$...', 'Administrador', 'admin', true);
```

### Default Financial Categories
```sql
INSERT INTO financial_categories (name, category_type, dre_group) VALUES
-- Revenue
('Vendas Balcão', 'revenue', 'sales'),
('Vendas Comanda', 'revenue', 'sales'),
('Vendas Delivery', 'revenue', 'sales'),

-- Costs
('Custo de Produtos', 'cost', 'cogs'),
('Taxas de Cartão', 'cost', 'cogs'),

-- Fixed Expenses
('Aluguel', 'expense', 'fixed_expenses'),
('Salários', 'expense', 'fixed_expenses'),
('Energia Elétrica', 'expense', 'fixed_expenses'),
('Água', 'expense', 'fixed_expenses'),
('Internet', 'expense', 'fixed_expenses'),

-- Variable Expenses
('Embalagens', 'expense', 'variable_expenses'),
('Marketing', 'expense', 'variable_expenses'),
('Entregadores', 'expense', 'variable_expenses'),
('Manutenção', 'expense', 'variable_expenses');
```

### Default Loyalty Configuration
```sql
INSERT INTO loyalty_config (points_per_real, min_purchase_value, points_to_real_ratio, min_points_redemption, is_active)
VALUES (1.0, 10.0, 0.01, 100, true);
```

---

**Database Version:** 1.0
**PostgreSQL:** 14+
**Extensions Required:** `pg_trgm`, `uuid-ossp`

---
