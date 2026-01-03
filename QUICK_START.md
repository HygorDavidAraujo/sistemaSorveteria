# 🚀 GUIA RÁPIDO - INICIAR O SISTEMA COMPLETO

## Pré-requisitos

- Node.js 18+
- NPM 9+
- Dois terminais (um para backend, outro para frontend)

---

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Terminal 1 - Backend

```bash
cd backend
npm install        # Se for primeira vez
npm run dev        # Inicia servidor em http://localhost:3000
```

Esperado:
```
✓ Backend rodando em http://localhost:3000
✓ Prisma conectado ao banco de dados
✓ Swagger disponível em http://localhost:3000/api-docs
```

### 2️⃣ Terminal 2 - Frontend

```bash
cd frontend
npm install        # Se for primeira vez
npm run dev        # Inicia servidor em http://localhost:5173
```

Esperado:
```
✓ Frontend rodando em http://localhost:5173
✓ Vite hot module reloading ativo
```

### 3️⃣ Acessar a Aplicação

Abra no navegador:
```
http://localhost:5173
```

### 4️⃣ Fazer Login

**Credenciais padrão:**
- Email: `hygordavidaraujo@gmail.com`
- Senha: `admin123`

---

## 🔧 Configuração de Ambiente

### Backend (.env)
```env
DATABASE_URL=seu_banco_de_dados
JWT_SECRET=sua_chave_secreta
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

*Ambos os arquivos já vêm pré-configurados para desenvolvimento local.*

---

## 📊 Testando as Funcionalidades

### 1. Dashboard
- ✅ Página inicial com resumo
- ✅ Status da sessão de caixa
- ✅ Estatísticas do dia

### 2. Vendas
- ✅ Selecionar produtos
- ✅ Ajustar quantidades
- ✅ Aplicar cupons
- ✅ Escolher forma de pagamento
- ✅ Finalizar venda

### 3. Produtos
- ✅ Criar novo produto
- ✅ Editar produtos
- ✅ Deletar produtos
- ✅ Buscar por nome

### 4. Clientes
- ✅ Criar novo cliente
- ✅ Ver detalhes
- ✅ Rastrear pontos de lealdade

### 5. Caixa
- ✅ Abrir sessão de caixa
- ✅ Fechar sessão
- ✅ Visualizar saldo

### 6. Lealdade
- ✅ Visualizar clientes com pontos
- ✅ Resgatar pontos
- ✅ Ver histórico

### 7. Relatórios
- ✅ Gerar relatórios diários
- ✅ Gerar relatórios mensais
- ✅ Exportar em CSV
- ✅ Análise por forma de pagamento

### 8. Configurações
- ✅ Ver perfil de usuário
- ✅ Fazer logout

---

## 🐛 Troubleshooting

### "Erro ao conectar com backend"
```bash
# Verificar se backend está rodando
http://localhost:3000

# Se não estiver:
cd backend
npm run dev
```

### "Porta 5173 já em uso"
```bash
# Usar porta diferente
npm run dev -- --port 5174
```

### "Porta 3000 já em uso"
```bash
# Backend em porta diferente
PORT=3001 npm run dev
# E atualizar .env frontend para http://localhost:3001
```

### "Erro de autenticação"
```bash
# Limpar localStorage
# Abrir DevTools (F12) -> Application -> Clear Storage
# Fazer login novamente
```

### "CORS error"
```bash
# Verificar .env backend
CORS_ORIGIN=http://localhost:5173

# Reiniciar backend
```

---

## 📁 Estrutura do Projeto

```
sistemaSorveteria/
├── backend/              ← API Node.js
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── shared/
│   ├── prisma/
│   ├── .env
│   └── package.json
├── frontend/             ← React App
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── hooks/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env
│   └── package.json
└── Documentação
    ├── README.md
    ├── FRONTEND_README.md
    ├── FRONTEND_USAGE_GUIDE.md
    ├── FRONTEND_IMPLEMENTATION_SUMMARY.md
    ├── FRONTEND_COMPLETE.md
    └── Este arquivo
```

---

## 🎯 Fluxo Básico de Uso

1. **Abrir sistema** → http://localhost:5173
2. **Login** → hygordavidaraujo@gmail.com / admin123
3. **Abrir caixa** → Caixa → Abrir com valor inicial
4. **Fazer venda** → Vendas → Selecionar produtos → Finalizar
5. **Ver relatório** → Relatórios → Gerar relatório do dia
6. **Fechar caixa** → Caixa → Fechar com saldo final

---

## 📈 Monitoramento

### Backend
```bash
# Ver logs em tempo real
npm run dev

# Acessar Swagger UI
http://localhost:3000/api-docs
```

### Frontend
```bash
# Abrir DevTools
F12 ou Ctrl+Shift+I

# Ver erros no Console
# Verificar Network para requisições
```

---

## 🔐 Segurança em Desenvolvimento

⚠️ **IMPORTANTE:** As credenciais abaixo são apenas para desenvolvimento local.

**Roles disponíveis:**
- `admin` - Acesso completo
- `manager` - Gerenciamento
- `operator` - Operações
- `cashier` - Caixa

Testar com diferentes usuários para validar permissões.

---

## 💾 Banco de Dados

### Verificar dados
```bash
cd backend

# Abrir Prisma Studio
npx prisma studio

# Ver schema
cat prisma/schema.prisma
```

### Resetar dados (⚠️ Cuidado!)
```bash
cd backend
npx prisma migrate reset

# Isso irá:
# 1. Dropar banco de dados
# 2. Recriar schema
# 3. Executar seed.ts
```

---

## 🚢 Deploy para Produção

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Servir pasta dist/ com servidor estático
```

---

## 📞 Suporte

**Para questões técnicas:**
1. Verificar a documentação de cada módulo
2. Consultar logs (backend e browser DevTools)
3. Verificar erros no console

**Documentações disponíveis:**
- `FRONTEND_README.md` - Documentação técnica
- `FRONTEND_USAGE_GUIDE.md` - Guia de uso
- `FRONTEND_IMPLEMENTATION_SUMMARY.md` - Resumo
- `FRONTEND_COMPLETE.md` - Status de conclusão

---

## ✅ Checklist Inicial

- [ ] Node.js 18+ instalado
- [ ] npm 9+ atualizado
- [ ] Backend rodando em http://localhost:3000
- [ ] Frontend rodando em http://localhost:5173
- [ ] Conseguiu fazer login
- [ ] Dashboard carregou
- [ ] Pode selecionar produtos
- [ ] Pode fazer uma venda
- [ ] Pode abrir/fechar caixa
- [ ] Pode visualizar relatórios

---

**Parabéns! 🎉 Seu sistema está pronto para uso!**

---

Desenvolvido com ❤️ por um Desenvolvedor Sênior  
Janeiro 2026 - v1.0.0
