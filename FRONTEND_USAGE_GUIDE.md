# Guia de Uso - Frontend Sorveteria

## 🔐 Login

1. Acesse `http://localhost:5173`
2. Use as credenciais fornecidas:
   - Email: `hygordavidaraujo@gmail.com`
   - Senha: `admin123`

Roles disponíveis:
- **Admin** - Acesso completo ao sistema
- **Manager** - Relatórios e gerenciamento
- **Operator** - Vendas e clientes
- **Cashier** - Caixa

## 📊 Dashboard

A página inicial mostra:
- Bem-vindo personalizado
- Status da sessão de caixa
- Estatísticas do dia
- Relatório diário
- Ações rápidas

## 💰 Sistema de Vendas

### Como registrar uma venda:

1. Clique em **"Vendas"** no menu
2. Selecione produtos clicando na grade
3. Ajuste quantidades no carrinho
4. (Opcional) Selecione cliente
5. (Opcional) Aplique cupom de desconto
6. Escolha forma de pagamento
7. Clique em **"Finalizar Venda"**

**Formas de Pagamento:**
- Dinheiro
- Cartão Crédito
- Cartão Débito
- PIX

## 📦 Gerenciar Produtos

### Adicionar Produto:
1. Clique em **"Produtos"**
2. Clique em **"+ Novo Produto"**
3. Preencha:
   - Nome
   - Descrição
   - Preço
   - Categoria
   - Disponibilidade
4. Clique em **"Criar Produto"**

### Editar Produto:
1. Procure o produto na grade
2. Clique em **"Editar"**
3. Faça as alterações
4. Clique em **"Atualizar"**

### Deletar Produto:
1. Procure o produto
2. Clique no ícone de lixeira
3. Confirme a exclusão

## 👥 Gerenciar Clientes

### Adicionar Cliente:
1. Clique em **"Clientes"**
2. Clique em **"+ Novo Cliente"**
3. Preencha:
   - Nome *
   - Email *
   - Telefone (opcional)
   - CPF (opcional)
4. Clique em **"Criar Cliente"**

### Ver Detalhes do Cliente:
1. Clique no ícone de olho
2. Veja pontos de lealdade e cashback

## 💳 Controle de Caixa

### Abrir Caixa:
1. Clique em **"Caixa"**
2. Clique em **"Abrir Caixa"**
3. Informe o saldo inicial em dinheiro
4. Clique em **"Abrir Caixa"**

### Fechar Caixa:
1. Acesse **"Caixa"**
2. Clique em **"Fechar Caixa"**
3. Confirme o saldo final
4. Clique em **"Fechar Caixa"**

**Dica:** O caixa precisa estar aberto para registrar vendas

## 🎁 Sistema de Lealdade

### Visualizar Pontos:
1. Clique em **"Lealdade"**
2. Procure o cliente na lista
3. Veja pontos disponíveis e histórico

### Resgatar Pontos:
1. Selecione o cliente
2. Clique em **"Resgatar Pontos"**
3. Informe a quantidade
4. Confirme resgate

**Conversão:** 1 ponto = R$ 0,10 de desconto

## 📈 Relatórios Financeiros

### Gerar Relatório:
1. Clique em **"Relatórios"** (apenas admin/manager)
2. Escolha tipo (Diário ou Mensal)
3. Selecione data/período
4. Clique em **"Gerar Relatório"**

### Análise do Relatório:
- **Total de Vendas** - Faturamento bruto
- **Formas de Pagamento** - Breakdown por método
- **Descontos** - Cupons e promoções aplicadas
- **Receita Líquida** - Valor final após descontos

### Exportar Relatório:
1. Clique em **"Baixar Relatório (CSV)"**
2. Abre no Excel para análise detalhada

## ⚙️ Configurações

Disponível apenas para admin:

1. Clique em **"Configurações"**
2. Visualize perfil e função
3. Acesse:
   - Editar Perfil
   - Alterar Senha
   - Tema e Idioma
   - Exportar/Limpar Dados
   - Logout

## 🔄 Usando Cupons

### Para cliente durante venda:
1. Na página de vendas, insira código do cupom
2. Clique em **"Aplicar"**
3. Desconto será calculado automaticamente
4. Finalize a venda

**Tipos de Cupom:**
- Percentual (ex: 10%)
- Fixo (ex: R$ 5,00)

## 📱 Dicas Úteis

### Mobile
- Menu fica em hambúrguer (≡)
- Toque para expandir/colapsar
- Interfaces adaptadas para telas pequenas

### Atalhos
- Dashboard: Home/Início
- Vendas: Venda rápida
- Clientes: Criar novo
- Caixa: Abrir/Fechar

### Notificações
- Sucesso: Confirmação em verde
- Erro: Aviso em vermelho
- Validação: Campos destacados

## 🆘 Troubleshooting

### "Erro ao carregar dados"
- Verifique se o backend está rodando
- Confirme URL da API em `.env`

### "Acesso negado"
- Verif ique sua função/role
- Admin pode acessar tudo

### "Sessão expirada"
- Faça login novamente
- Token foi invalidado

### Problemas com vendas
- Confirme caixa está aberto
- Verifique produtos disponíveis
- Confirme estoque

## 📞 Suporte

Para questões técnicas:
1. Verifique este guia
2. Consulte a documentação da API
3. Verifique logs do navegador (F12)

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2026
