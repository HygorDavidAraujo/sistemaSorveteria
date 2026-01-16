# Instalação rápida (scripts)

## 1) Instalar requisitos
- Docker Desktop
- Git

## 2) Instalar o sistema
1. Abra o PowerShell como Administrador.
2. Rode o instalador:
   - ./scripts/INSTALL_NEW_MACHINE.ps1 -RepoUrl "<URL_REPO>" -ProjectDir "C:\Sistemas\sistemaSorveteria" -EnvSource "C:\Backups\backend.env" -FrontendEnvSource "C:\Backups\frontend.env" -RunMigrate

## 3) Backup do banco (máquina atual)
- ./scripts/BACKUP_DB.ps1 -ContainerName "gelatini-postgres" -DbName "gelatini_db" -DbUser "gelatini" -OutFile "C:\Backups\gelatini_db.sql"

## 4) Restore do banco (nova máquina)
- ./scripts/RESTORE_DB.ps1 -ContainerName "gelatini-postgres" -DbName "gelatini_db" -DbUser "gelatini" -InFile "C:\Backups\gelatini_db.sql"

## 5) Pós-instalação
- Validar login, vendas, comandas, delivery, impressão e balança.

> Ajuste nomes de container, usuário e banco conforme sua configuração.