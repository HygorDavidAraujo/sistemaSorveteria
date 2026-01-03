# Frontend - Sistema de Gestão Sorveteria

## 🎯 Visão Geral

Frontend moderno e profissional para o Sistema de Gestão de Sorveteria, desenvolvido com React, TypeScript, Tailwind CSS e Zustand para gerenciamento de estado.

## 📋 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Header.tsx       # Cabeçalho da aplicação
│   │   ├── Sidebar.tsx      # Menu lateral
│   │   ├── PrivateRoute.tsx # Rotas protegidas
│   │   └── common.tsx       # Componentes comuns (Button, Input, Card, etc)
│   ├── pages/              # Páginas da aplicação
│   │   ├── LoginPage.tsx    # Página de login
│   │   ├── DashboardPage.tsx # Dashboard principal
│   │   ├── SalesPage.tsx    # Gerenciamento de vendas
│   │   ├── ProductsPage.tsx # Gerenciamento de produtos
│   │   ├── CustomersPage.tsx # Gerenciamento de clientes
│   │   ├── CashPage.tsx     # Controle de caixa
│   │   ├── LoyaltyPage.tsx  # Sistema de lealdade
│   │   ├── ReportsPage.tsx  # Relatórios financeiros
│   │   └── SettingsPage.tsx # Configurações
│   ├── services/
│   │   └── api.ts          # Cliente HTTP com Axios
│   ├── store/
│   │   └── index.ts        # Stores Zustand
│   ├── types/
│   │   └── index.ts        # Definições TypeScript
│   ├── utils/              # Utilitários
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Entry point
│   └── index.css           # Estilos globais
├── public/                 # Arquivos estáticos
├── index.html              # HTML principal
├── vite.config.ts          # Configuração Vite
├── tailwind.config.js      # Configuração Tailwind
├── postcss.config.js       # Configuração PostCSS
└── package.json            # Dependências
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Backend rodando em http://localhost:3000

### Instalação

```bash
cd frontend
npm install
```

### Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
```

## 🎨 Tecnologias Utilizadas

- **React 19** - Framework UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Zustand** - Gerenciamento de estado
- **React Router** - Roteamento
- **Axios** - Requisições HTTP
- **Lucide React** - Ícones
- **Date-fns** - Manipulação de datas
- **Vite** - Build tool

## 🔐 Autenticação

A autenticação é feita via JWT token armazenado no localStorage:

```typescript
// Login
const { login } = useAuthStore();
await login(email, password);

// Logout
const { logout } = useAuthStore();
await logout();
```

## 📊 Gerenciamento de Estado

Utilizamos Zustand para gerenciar o estado global:

```typescript
// Auth Store
import { useAuthStore } from '@/store';
const { user, login, logout } = useAuthStore();

// Sales Store
import { useSalesStore } from '@/store';
const { items, addItem, removeItem, clear } = useSalesStore();

// Cash Session Store
import { useCashSessionStore } from '@/store';
const { currentSession, openSession, closeSession } = useCashSessionStore();
```

## 🔌 API Integration

O cliente HTTP está configurado em `src/services/api.ts`:

```typescript
import { apiClient } from '@/services/api';

// Produtos
await apiClient.getProducts();
await apiClient.createProduct(data);
await apiClient.updateProduct(id, data);

// Vendas
await apiClient.createSale(data);
await apiClient.getSales();

// Clientes
await apiClient.getCustomers();
await apiClient.createCustomer(data);

// Caixa
await apiClient.openCashSession(balance);
await apiClient.closeCashSession(balance);

// Relatórios
await apiClient.getDailyReport(date);
await apiClient.getMonthlyReport(month, year);
```

## 🎯 Funcionalidades Principais

### 1. Dashboard
- Resumo do dia
- Status da sessão de caixa
- Estatísticas rápidas
- Links para ações rápidas

### 2. Sistema de Vendas
- Seleção de produtos com interface intuitiva
- Carrinho de compras em tempo real
- Aplicação de cupons de desconto
- Suporte a múltiplas formas de pagamento
- Integração com sistema de lealdade

### 3. Gerenciamento de Produtos
- CRUD completo
- Categorização (Sorvete, Bebida, Sobremesa, Outro)
- Controle de disponibilidade
- Busca e filtros

### 4. Gerenciamento de Clientes
- CRUD completo
- Rastreamento de pontos de lealdade
- Saldo de cashback
- Histórico de transações

### 5. Controle de Caixa
- Abertura e fechamento de caixa
- Acompanhamento de saldo
- Histórico de transações

### 6. Sistema de Lealdade
- Visualização de pontos
- Resgate de pontos com desconto
- Histórico de transações
- Gerenciamento de cashback

### 7. Relatórios Financeiros
- Relatórios diários e mensais
- Análise por forma de pagamento
- Rastreamento de descontos
- Exportação em CSV

## 🎨 Design e Componentes

### Cores Principais
```css
primary: #FF6B6B (Rosa)
secondary: #4ECDC4 (Turquesa)
accent: #FFE66D (Amarelo)
dark: #2C3E50 (Escuro)
light: #ECF0F1 (Claro)
danger: #E74C3C (Vermelho)
success: #27AE60 (Verde)
warning: #F39C12 (Laranja)
```

### Componentes Reutilizáveis
- `Button` - Botões com variações
- `Input` - Campos de entrada
- `Select` - Campos de seleção
- `Card` - Containers
- `Badge` - Tags/Labels
- `Alert` - Mensagens
- `Modal` - Diálogos
- `Loading` - Indicador de carregamento

## 🔒 Autenticação e Autorização

As rotas são protegidas por função de usuário:

```typescript
<PrivateRoute requiredRole={['admin', 'manager']}>
  <Page />
</PrivateRoute>
```

Roles disponíveis:
- `admin` - Acesso total
- `manager` - Gerenciamento e relatórios
- `operator` - Operações básicas
- `cashier` - Operações de caixa

## 📱 Responsividade

A interface é totalmente responsiva:
- Desktop: Layout com sidebar fixo
- Tablet: Sidebar dobrável
- Mobile: Menu hamburger

## 🐛 Debugging

Para debugging, ative o modo de desenvolvimento:

```bash
npm run dev
```

O Vite fornece Hot Module Replacement para desenvolvimento rápido.

## 📈 Performance

- Code splitting automático com Vite
- Tree shaking de dependências não utilizadas
- Otimização de imagens
- Lazy loading de rotas

## 🔄 Fluxo de Dados

```
Usuário → Component → Store (Zustand) → API Client → Backend
```

## 📝 Convenções de Código

- Componentes em `PascalCase`
- Hooks personalizados em `camelCase`
- Propriedades de componentes bem tipadas
- Imports organizados (react, bibliotecas, componentes, serviços)

## 🤝 Contribuição

Ao contribuir, mantenha:
- Tipagem TypeScript rigorosa
- Componentes funcionais
- Hooks para lógica
- Estilos com Tailwind CSS

## 📄 Licença

MIT
