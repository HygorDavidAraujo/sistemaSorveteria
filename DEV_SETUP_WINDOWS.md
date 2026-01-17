# Setup de Desenvolvimento - Windows

Este guia explica como rodar o sistema no Windows com acesso a dispositivos locais (balança, impressora).

## Arquitetura de Desenvolvimento

### Windows (Desenvolvimento)
- **Postgres + Redis**: Rodam no Docker
- **Backend + Frontend**: Rodam localmente via npm
- **Motivo**: Acesso direto a portas COM (balança, impressora)

### Linux (Produção)
- **Tudo no Docker**: Backend + Frontend + Postgres + Redis
- **Motivo**: Melhor performance, Docker acessa `/dev/ttyUSB0` diretamente

## Pré-requisitos

✅ Docker Desktop instalado e rodando  
✅ Node.js v18+ instalado  
✅ npm instalado  
✅ Git  

## Início Rápido

### 1. Clone o repositório (se ainda não fez)
```powershell
git clone <repo-url>
cd sistemaSorveteria
```

### 2. Execute o script de setup
```powershell
.\start-dev.ps1
```

Este script irá:
- ✅ Iniciar Postgres + Redis no Docker
- ✅ Instalar dependências (se necessário)
- ✅ Executar migrations do banco
- ✅ Preparar o ambiente

### 3. Inicie o Backend (Terminal 1)
```powershell
cd backend
npm run dev
```

O backend estará disponível em: `http://localhost:3000`

### 4. Inicie o Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

## Configuração da Balança

A balança está configurada no arquivo `backend.env`:

```env
SCALE_ENABLED=true
SCALE_MANUFACTURER=TOLEDO
SCALE_MODEL="PRIX 3 FIT"
SCALE_PROTOCOL=toledo_prix
SCALE_PORT=COM3          # ⚠️ AJUSTE para sua porta COM correta
SCALE_BAUDRATE=9600
```

### Como encontrar a porta COM da balança

1. Conecte a balança via USB
2. Abra o **Gerenciador de Dispositivos** (Win + X → Gerenciador de Dispositivos)
3. Expanda **Portas (COM e LPT)**
4. Identifique a porta (ex: `COM3`, `COM4`)
5. Ajuste `SCALE_PORT=COM3` no arquivo `backend.env`

## Parar o Ambiente

```powershell
.\stop-dev.ps1
```

Ou manualmente:
1. Pare o backend (Ctrl+C no terminal 1)
2. Pare o frontend (Ctrl+C no terminal 2)
3. Pare o Docker: `docker compose -f docker-compose.dev.yml down`

## Estrutura de Arquivos

```
sistemaSorveteria/
├── docker-compose.yml          # Produção (Full Docker)
├── docker-compose.dev.yml      # Desenvolvimento (só Postgres + Redis)
├── start-dev.ps1               # Script de início (Windows)
├── stop-dev.ps1                # Script de parada (Windows)
├── backend.env                 # Variáveis do backend
├── backend/
│   ├── package.json
│   └── src/
└── frontend/
    ├── package.json
    └── src/
```

## URLs do Sistema

| Serviço    | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:5173            |
| Backend    | http://localhost:3000            |
| API        | http://localhost:3000/api/v1     |
| Postgres   | localhost:5433                   |
| Redis      | localhost:6379                   |

## Credenciais Padrão

Após o seed, use:
- **Email**: admin@gelatini.com
- **Senha**: admin123

## Troubleshooting

### Docker não inicia
- Verifique se o Docker Desktop está rodando
- Execute: `docker ps` para listar containers

### Erro de porta já em uso
- Postgres (5433): `docker ps` e pare container conflitante
- Backend (3000): Verifique se já tem algo rodando na porta 3000
- Frontend (5173): Verifique se já tem algo rodando na porta 5173

### Balança não funciona
1. Verifique a porta COM no Gerenciador de Dispositivos
2. Ajuste `SCALE_PORT` no `backend.env`
3. Reinicie o backend

### Erro no Prisma/Migrations
```powershell
cd backend
npm run db:migrate
```

## Dicas

💡 Use **VS Code** com extensões:
- Prisma
- ESLint
- Prettier
- Docker

💡 Para debug:
- Backend: Use VS Code debugger (F5)
- Frontend: Use React DevTools no navegador

💡 Logs do backend aparecem diretamente no terminal

## Diferenças Dev vs Produção

| Aspecto         | Desenvolvimento (Windows)  | Produção (Linux)        |
|-----------------|---------------------------|-------------------------|
| Backend         | npm run dev (local)       | Docker container        |
| Frontend        | npm run dev (local)       | Docker container        |
| Hot Reload      | ✅ Sim                    | ❌ Não                  |
| Balança/COM     | ✅ Acesso direto          | ✅ Via /dev/ttyUSB0     |
| Performance     | Normal                    | Otimizado               |
| Uso             | Desenvolvimento           | Produção/Deploy         |
