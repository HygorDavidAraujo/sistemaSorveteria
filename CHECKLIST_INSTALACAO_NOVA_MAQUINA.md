# ✅ Checklist 100% Completo — Instalação em Nova Máquina

Data: 16/01/2026

Este documento reúne o passo a passo completo para instalar o sistema em uma nova máquina, incluindo backup/restore do banco e procedimento da balança.

---

## 1) Pré‑requisitos
- Docker Desktop instalado e atualizado.
- Git instalado.
- Acesso administrativo na máquina.
- Rede local estável (servidor local).

### Links oficiais de download
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Git: https://git-scm.com/downloads
- WSL2 (Windows): https://learn.microsoft.com/windows/wsl/install
- USB/IP (usbipd‑win): https://github.com/dorssel/usbipd-win/releases

**Drivers (fabricante):**
- Impressoras térmicas: Epson / Elgin / Bematech / Daruma / Star
- Balanças: Toledo / Urano / Filizola

---

## 2) Código (repositório)
1. Clonar o repositório (ou copiar a pasta do projeto). 
2. Confirmar estrutura completa do projeto (backend, frontend, docker‑compose, arquivos .env).

---

## 3) Arquivos de ambiente
Copiar os arquivos de ambiente da máquina atual para a nova máquina:
- backend.env / backend/.env
- frontend/.env (se existir)

Conferir:
- Senhas do Postgres e Redis
- JWT_SECRET e outros tokens
- Portas e URL do backend

---

## 4) Backup do banco (máquina atual)
> Necessário para levar TODOS os dados reais (clientes, vendas, configurações etc.).

### 4.1) Backup via Docker (Postgres)
1. Identificar o container do Postgres (ex: gelatini-postgres).
2. Exportar o dump para um arquivo:
   - Faça o dump completo do banco.
   - Salve o arquivo em local seguro.

**Resultado:** arquivo .sql do banco atual.

---

## 5) Restore do banco (nova máquina)
1. Subir os containers base (Postgres e Redis).
2. Importar o arquivo .sql gerado no passo anterior para o banco da nova máquina.
3. Verificar se as tabelas e dados foram restaurados com sucesso.

---

## 6) Subida de containers
1. Na nova máquina, subir os serviços com Docker Compose (produção):
   - backend
   - frontend
   - postgres
   - redis
   - nginx (se aplicável)

2. Confirmar status saudável dos containers.

---

## 7) Migrações
- Aplicar migrações do Prisma (se houver versões mais novas do schema).
- Garantir que o banco esteja sincronizado com o código.

---

## 8) Verificação funcional mínima
- Login no sistema.
- Abrir caixa.
- Fazer venda PDV.
- Abrir comanda e fechar com pagamento.
- Criar delivery e imprimir pedido.
- Testar cupons, cashback e pontos.
- Testar impressão de pré‑conta e fechamento.
- Testar leitura da balança.

---

## 9) Impressoras térmicas 80mm
1. Instalar drivers da impressora na máquina.
2. Configurar no sistema a aba **Configurações → Impressão**.
3. Testar pré‑conta e fechamento com impressão real.

---

## 10) Balança — Procedimento exato

### A) Windows + Docker + WSL2 (USB pass‑through)
1. Conectar o adaptador USB‑Serial da balança.
2. Identificar o dispositivo:
   - Usar `usbipd wsl list` no Windows.
3. Liberar e anexar ao WSL:
   - `usbipd wsl attach --busid <BUSID>`
4. No WSL, verificar `/dev/ttyUSB0`.
5. No docker‑compose, garantir mapeamento do device:
   - `/dev/ttyUSB0:/dev/ttyUSB0`
6. No sistema: Configurações → Balança
   - Porta: `/dev/ttyUSB0`
   - Baud rate: 115200 (Toledo PRIX) ou 9600 conforme modelo
   - Protocolo: Toledo PRIX / Urano / Filizola
   - Comando de leitura: `\x05` (Toledo PRIX)
7. Testar leitura na aba Balança.

### B) Linux (sem WSL)
1. Conectar a balança via USB‑Serial.
2. Verificar a porta:
   - `/dev/ttyUSB0` ou `/dev/ttyACM0`
3. Garantir permissão de leitura.
4. No docker‑compose, mapear a porta no backend.
5. Configurar a porta e parâmetros no sistema.

---

## 11) Segurança e operação
- Trocar senhas padrão.
- Criar usuários e perfis (admin/caixa).
- Definir rotina de backup diário do banco.

---

## 12) Plano de backup diário (recomendado)
- Backup automático 1x ao dia em pasta externa.
- Rotacionar backups (últimos 7 dias).
- Testar restore mensal.

---

## 13) Checklist rápido final
- [ ] Docker instalado e ok
- [ ] Código clonado
- [ ] .env copiados
- [ ] Banco restaurado
- [ ] Containers ativos
- [ ] Migrações aplicadas
- [ ] Impressoras testadas
- [ ] Balança testada
- [ ] Usuários criados
- [ ] Backup diário configurado

---

Se quiser, posso complementar com o passo‑a‑passo exato dos comandos de backup/restore conforme o nome do container do Postgres.