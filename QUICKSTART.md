# 🚀 GELATINI - Quick Start Guide

Guia rápido para começar a usar o sistema GELATINI em menos de 5 minutos.

---

## ⚡ Início Rápido

### Pré-requisitos

- Windows 10/11
- Docker Desktop instalado ([Download aqui](https://www.docker.com/products/docker-desktop))
- Git instalado

### Instalação em 3 Passos

#### 1️⃣ Clone e Configure

```powershell
# Clone o repositório
cd C:\Users\hygor\Documentos\Sorveteria
cd sistemaSorveteria

# Copie o arquivo de ambiente
copy backend\.env.example backend\.env
```

#### 2️⃣ Inicie os Serviços

```powershell
# Inicie todos os serviços (PostgreSQL, Redis, Backend)
docker-compose up -d

# Aguarde 30 segundos para os serviços iniciarem...
timeout /t 30

# Execute as migrations do banco
docker-compose exec backend npx prisma migrate deploy

# Popule com dados iniciais
docker-compose exec backend npm run db:seed
```

#### 3️⃣ Acesse o Sistema

🎉 **Pronto!** O sistema já está rodando:

- **API Backend**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/health
- **Prisma Studio** (visualizar banco): `docker-compose exec backend npx prisma studio`

---

## 🔐 Login Inicial

Use estas credenciais para primeiro acesso:

```
Email: hygordavidaraujo@gmail.com
Senha: admin123
```

**⚠️ IMPORTANTE:** Altere essa senha imediatamente após o primeiro login!

---

## 🧪 Testando a API

### 1. Fazer Login

```powershell
# PowerShell
$body = @{
    email = "admin@gelatini.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$token = $response.data.accessToken
Write-Host "Token obtido: $token"
```

### 2. Criar um Cliente

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$customer = @{
    name = "João Silva"
    phone = "(11) 98765-4321"
    whatsapp = "(11) 98765-4321"
    email = "joao@email.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers" `
    -Method Post `
    -Headers $headers `
    -Body $customer
```

### 3. Listar Produtos

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" `
    -Method Get `
    -Headers $headers
```

---

## 📋 Fluxo Completo de Venda

### 1. Abrir Caixa

```powershell
$cashSession = @{
    terminalId = "CAIXA-01"
    initialCash = 100.00
    openingNotes = "Abertura do dia"
} | ConvertTo-Json

$session = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/cash-sessions" `
    -Method Post `
    -Headers $headers `
    -Body $cashSession

$sessionId = $session.data.id
Write-Host "Caixa aberto: $sessionId"
```

### 2. Buscar Cliente (opcional)

```powershell
$customers = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/customers/search?search=João" `
    -Method Get `
    -Headers $headers

$customerId = $customers.data[0].id
```

### 3. Listar Produtos Disponíveis

```powershell
$products = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" `
    -Method Get `
    -Headers $headers

$productId = $products.data[0].id
```

### 4. Registrar Venda

```powershell
$sale = @{
    cashSessionId = $sessionId
    customerId = $customerId
    saleType = "pdv"
    items = @(
        @{
            productId = $productId
            quantity = 2
            unitPrice = 12.00
        }
    )
    payments = @(
        @{
            method = "cash"
            amount = 24.00
        }
    )
} | ConvertTo-Json -Depth 10

$newSale = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sales" `
    -Method Post `
    -Headers $headers `
    -Body $sale

Write-Host "Venda registrada: #$($newSale.data.saleNumber)"
```

### 5. Fechar Caixa (Operador)

```powershell
$cashierClose = @{
    cashCount = 124.00
    notes = "Fechamento normal"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/cash-sessions/$sessionId/cashier-close" `
    -Method Post `
    -Headers $headers `
    -Body $cashierClose
```

### 6. Validar Fechamento (Gerente)

```powershell
$managerClose = @{
    validated = $true
    notes = "Conferido e aprovado"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/cash-sessions/$sessionId/manager-close" `
    -Method Post `
    -Headers $headers `
    -Body $managerClose
```

---

## 🛠️ Comandos Úteis

### Docker

```powershell
# Ver logs em tempo real
docker-compose logs -f backend

# Parar todos os serviços
docker-compose down

# Reiniciar um serviço específico
docker-compose restart backend

# Acessar o shell do container
docker-compose exec backend sh

# Limpar tudo e começar do zero
docker-compose down -v
docker-compose up -d
```

### Prisma (Banco de Dados)

```powershell
# Ver o banco de dados visualmente
docker-compose exec backend npx prisma studio

# Criar nova migration
docker-compose exec backend npx prisma migrate dev --name nome_da_migration

# Resetar banco (CUIDADO!)
docker-compose exec backend npx prisma migrate reset

# Executar seed novamente
docker-compose exec backend npm run db:seed
```

### Logs

```powershell
# Ver logs da API
docker-compose exec backend cat logs/combined-$(Get-Date -Format yyyy-MM-dd).log

# Ver logs de erro
docker-compose exec backend cat logs/error-$(Get-Date -Format yyyy-MM-dd).log
```

---

## 🐛 Troubleshooting

### Problema: "Database connection failed"

**Solução:**
```powershell
# Verifique se o PostgreSQL está rodando
docker-compose ps

# Reinicie o PostgreSQL
docker-compose restart postgres

# Aguarde 10 segundos
timeout /t 10

# Reinicie o backend
docker-compose restart backend
```

### Problema: "Port already in use"

**Solução:**
```powershell
# Encontre o processo usando a porta 3000
netstat -ano | findstr :3000

# Mate o processo (substitua PID)
taskkill /PID <PID> /F

# Reinicie os serviços
docker-compose up -d
```

### Problema: "Cannot connect to Docker daemon"

**Solução:**
1. Abra o Docker Desktop
2. Aguarde inicializar completamente
3. Execute `docker-compose up -d` novamente

### Problema: "Module not found"

**Solução:**
```powershell
# Reinstale as dependências
docker-compose exec backend npm install

# Reconstrua a imagem
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

---

## 📚 Próximos Passos

1. ✅ Testar todas as APIs usando o Postman ou Insomnia
2. ✅ Criar usuários adicionais (Manager, Cashier)
3. ✅ Cadastrar produtos reais da sua sorveteria
4. ✅ Cadastrar clientes
5. ✅ Configurar o programa de fidelidade
6. ✅ Fazer vendas de teste
7. ✅ Gerar um DRE do período

---

## 🎓 Tutoriais em Vídeo

*(Em breve)*

- [ ] Instalação completa
- [ ] Primeiro acesso e configuração
- [ ] Fluxo de venda no PDV
- [ ] Gestão de comandas
- [ ] Controle de caixa
- [ ] Relatórios financeiros

---

## 💬 Suporte

Problemas? Dúvidas?

1. Verifique o [README.md](./README.md) principal
2. Consulte a [documentação da API](./API_DOCUMENTATION.md)
3. Abra uma issue no GitHub
4. Entre em contato: suporte@gelatini.com

---

## ✅ Checklist de Implantação

- [ ] Sistema instalado e rodando
- [ ] Banco de dados populado com dados iniciais
- [ ] Senha do admin alterada
- [ ] Usuários operacionais criados
- [ ] Produtos cadastrados
- [ ] Clientes principais cadastrados
- [ ] Categorias financeiras configuradas
- [ ] Programa de fidelidade configurado
- [ ] Teste de venda completo realizado
- [ ] Teste de fechamento de caixa realizado
- [ ] Backup configurado
- [ ] Equipe treinada

---

**Boas vendas! 🍦**

Versão 1.0 - Janeiro 2026
