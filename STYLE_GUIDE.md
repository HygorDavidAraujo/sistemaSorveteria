# Guia de Estilo CSS - Sistema Sorveteria

## 📐 Design System

### 🎨 Paleta de Cores

#### Cores Primárias
```css
--color-primary: #3b82f6;        /* Azul principal */
--color-primary-dark: #2563eb;   /* Azul escuro */
--color-secondary: #06b6d4;      /* Ciano */
--color-secondary-dark: #0891b2; /* Ciano escuro */
```

#### Cores de Status
```css
--color-success: #22c55e;        /* Verde - sucesso */
--color-success-dark: #16a34a;   /* Verde escuro */
--color-danger: #ef4444;         /* Vermelho - erro */
--color-danger-dark: #dc2626;    /* Vermelho escuro */
--color-warning: #f59e0b;        /* Amarelo - aviso */
--color-warning-dark: #d97706;   /* Amarelo escuro */
--color-accent: #fbbf24;         /* Amarelo acentuado */
```

#### Cores Neutras
```css
--color-light: #f1f5f9;          /* Cinza claro - backgrounds */
--color-dark: #0f172a;           /* Preto suave - texto */
--color-gray-200: #e5e7eb;       /* Cinza 200 */
--color-gray-500: #64748b;       /* Cinza 500 */
--color-gray-600: #475569;       /* Cinza 600 */
--color-gray-700: #334155;       /* Cinza 700 */
--color-gray-900: #0f172a;       /* Cinza 900 */
--color-border: #e2e8f0;         /* Cinza - bordas */
```

---

## 📏 Espaçamento

### Gap entre Elementos
```css
/* Entre seções principais */
gap: 32px;

/* Entre cards/componentes */
gap: 20px - 24px;

/* Entre itens de lista */
gap: 12px - 16px;

/* Entre ícones e texto */
gap: 8px - 12px;
```

### Padding
```css
/* Cards grandes */
padding: 24px;

/* Cards médios */
padding: 20px;

/* Cards pequenos */
padding: 16px;

/* Inputs/Buttons */
padding: 12px 16px;
```

---

## 🔲 Bordas e Cantos

### Border Radius
```css
--border-radius: 8px;       /* Padrão - inputs, buttons */
--border-radius-lg: 12px;   /* Cards médios */
--border-radius-xl: 16px;   /* Cards grandes, modais */

/* Badges circulares */
border-radius: 20px;
border-radius: 9999px; /* Totalmente circular */
```

### Borders
```css
/* Padrão */
border: 1px solid var(--color-border);

/* Hover/Focus */
border: 1px solid var(--color-primary);

/* Danger Zone */
border: 2px solid var(--color-danger);

/* Empty State */
border: 1px dashed var(--color-border);
```

---

## 🌟 Sombras

```css
/* Sombra suave - estado normal */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Sombra média - hover */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
             0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Sombra grande - destaque */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
             0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Sombra extra - modal */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

---

## 📝 Tipografia

### Hierarquia de Títulos
```css
/* Page Title (h1) */
font-size: 30px;
font-weight: 700;
line-height: 1.2;
color: var(--color-dark);

/* Section Title (h2) */
font-size: 20px - 24px;
font-weight: 600;
line-height: 1.2;
color: var(--color-dark);

/* Card Title (h3) */
font-size: 16px - 18px;
font-weight: 600;
color: var(--color-dark);
```

### Body Text
```css
/* Texto normal */
font-size: 14px - 16px;
line-height: 1.6;
color: var(--color-dark);

/* Texto secundário */
font-size: 13px - 14px;
color: #64748b;

/* Labels */
font-size: 12px - 14px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #64748b;
```

### Valores/Métricas
```css
/* Valores grandes (dashboard) */
font-size: 32px - 36px;
font-weight: 700;
letter-spacing: -0.02em;

/* Valores médios */
font-size: 20px - 28px;
font-weight: 700;

/* Valores pequenos */
font-size: 16px - 18px;
font-weight: 600;
```

---

## 🎭 Estados Interativos

### Hover
```css
.element {
  transition: all 0.2s ease;
}

.element:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary);
}
```

### Focus (Inputs)
```css
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Active/Selected
```css
.card.active {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.02);
  box-shadow: var(--shadow-md);
}
```

### Disabled
```css
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 🏷️ Badges e Status

### Estrutura Base
```css
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Variantes
```css
/* Success */
.badge-success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

/* Danger */
.badge-danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

/* Warning */
.badge-warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

/* Info */
.badge-info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}
```

---

## 📊 Tabelas

### Estrutura
```css
.table-wrapper {
  overflow-x: auto;
  background: white;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: var(--color-light);
}

.table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr {
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s ease;
}

.table tbody tr:hover {
  background: #f9fafb;
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table td {
  padding: 16px;
  font-size: 14px;
  color: var(--color-dark);
}
```

---

## 🎴 Cards

### Card Base
```css
.card {
  padding: 24px;
  background: white;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

### Card Interativo
```css
.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-interactive.active {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.02);
  box-shadow: var(--shadow-md);
}
```

---

## 📱 Grids Responsivos

### Auto-Fill (Largura Fixa)
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
```

### Auto-Fit (Expande)
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
```

### Breakpoints Comuns
```css
/* Mobile First */
.grid {
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet (640px) */
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop (1024px) */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}
```

---

## 🎬 Animações

### Transitions
```css
/* Padrão - todas propriedades */
transition: all 0.2s ease;

/* Específico */
transition: transform 0.2s ease, box-shadow 0.2s ease;

/* Hover com elevação */
.element:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Hover lateral */
.element:hover {
  transform: translateX(4px);
}
```

### Keyframes
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## 🎯 Botões

### Button Base
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.button:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.button:active {
  transform: translateY(0);
}
```

### Variantes
```css
/* Primary */
.button-primary {
  background: var(--color-primary);
  color: white;
}

.button-primary:hover {
  background: var(--color-primary-dark);
}

/* Secondary */
.button-secondary {
  background: var(--color-secondary);
  color: white;
}

/* Danger */
.button-danger {
  background: var(--color-danger);
  color: white;
}

/* Outline */
.button-outline {
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}
```

---

## 🚨 Empty States

```css
.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: #f9fafb;
  border-radius: var(--border-radius-lg);
  border: 1px dashed var(--color-border);
}

.empty-state-icon {
  font-size: 48px;
  color: #cbd5e1;
  margin-bottom: 16px;
}

.empty-state-text {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}
```

---

## ✅ Checklist para Novos Componentes

1. ✅ Usar variáveis CSS do App.css
2. ✅ Border radius: 8px (padrão) ou 12px (cards)
3. ✅ Box shadow: shadow-sm normal, shadow-md hover
4. ✅ Transition: all 0.2s ease
5. ✅ Padding: 20-24px para cards
6. ✅ Gap: 32px entre seções, 20px entre cards
7. ✅ Font-size títulos: 30px (h1), 20-24px (h2)
8. ✅ Hover effect: transform + shadow
9. ✅ Border: 1px solid var(--color-border)
10. ✅ Cores de status com 10% opacity no background

---

## 🎨 Exemplos Práticos

### Card com Hover
```css
.my-card {
  padding: 24px;
  background: white;
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  cursor: pointer;
}

.my-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary);
}
```

### Status Badge
```css
.status-badge {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}
```

### Input com Focus
```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

---

## 📚 Recursos Adicionais

### Ferramentas
- [Coolors.co](https://coolors.co/) - Paletas de cores
- [Shadow Generator](https://shadows.brumm.af/) - Gerador de sombras CSS
- [Border Radius Preview](https://9elements.github.io/fancy-border-radius/)

### Inspirações
- Google Material Design
- Tailwind CSS
- Shadcn/ui
- Stripe Design System

---

**Última atualização**: 05/01/2026
