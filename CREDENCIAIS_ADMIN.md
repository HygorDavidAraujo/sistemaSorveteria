# 🔐 Credenciais do Sistema

## ✅ Seed Executado com Sucesso

O banco de dados foi populado com dados iniciais.

---

## 👤 Usuário Administrador

```
📧 Email: hygordavidaraujo@gmail.com
🔑 Senha: admin123
👥 Perfil: admin
✓ Status: Ativo
```

**⚠️ IMPORTANTE**: Altere a senha padrão após o primeiro login!

---

## 💰 Categorias Financeiras Criadas

### 📈 Receitas (Revenue)
- Vendas Balcão
- Vendas Comanda
- Vendas Delivery

### 📊 Custos (Cost)
- Custo de Produtos (CPV)
- Taxas de Cartão

### 💸 Despesas Fixas (Fixed Expenses)
- Aluguel
- Salários e Encargos
- Energia Elétrica
- Água
- Internet e Telefone
- Contabilidade

### 📉 Despesas Variáveis (Variable Expenses)
- Embalagens
- Marketing e Publicidade
- Delivery e Frete
- Manutenção
- Material de Limpeza

---

## 🎁 Configurações de Fidelidade

```yaml
Pontos por Real: 1 ponto
Compra Mínima: R$ 10,00
Validade dos Pontos: 365 dias
Pontos Mínimos p/ Resgate: 100 pontos
Valor do Resgate: R$ 0,01 por ponto
Aplicar a Todos Produtos: Sim
Status: Ativo
```

---

## 💵 Configurações de Cashback

```yaml
Porcentagem: 5%
Compra Mínima: R$ 20,00
Cashback Máximo por Compra: R$ 20,00
Validade: 180 dias
Cashback Mínimo p/ Uso: R$ 5,00
Aplicar a Todos Produtos: Sim
Status: Ativo
```

---

## 📦 Categorias de Produtos

1. **Sorvetes** - Sorvetes artesanais
2. **Açaí** - Açaí e complementos
3. **Picolés** - Picolés variados
4. **Bebidas** - Refrigerantes e sucos
5. **Confeitos** - Balas, chocolates, etc

---

## 🌐 Acessar o Sistema

1. Abra o navegador em: **http://localhost:5173**
2. Faça login com as credenciais acima
3. Comece a usar o sistema!

---

## 🔄 Re-executar o Seed

Se precisar recriar os dados:

```powershell
# Recriar apenas o admin
docker exec gelatini-backend node seed-admin.js

# Recriar dados iniciais (categorias, configs)
docker exec gelatini-backend node seed-data.js
```

---

## 🗄️ Banco de Dados

```yaml
Host: localhost:5433
Database: gelatini_db
User: gelatini
Password: gelatini123
```

---

## ✨ Próximos Passos

1. ✅ Login no sistema
2. ✅ Alterar senha do admin
3. ✅ Cadastrar produtos
4. ✅ Configurar impressoras
5. ✅ Abrir caixa
6. ✅ Iniciar vendas

---

**Data de Criação**: 16/01/2026
**Sistema**: GELATINI ERP & PDV
