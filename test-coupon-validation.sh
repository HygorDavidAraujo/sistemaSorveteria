#!/bin/bash

# Script para testar cupom com e sem cliente

API_URL="http://localhost:3000/api/v1"
USER_EMAIL="hygordavidaraujo@gmail.com"
USER_PASSWORD="admin123"

echo "=== TESTE DE VALIDAÇÃO DE CUPOM ==="

# 1. Login
echo ""
echo "1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: ${TOKEN:0:20}..."

# 2. Buscar cliente
echo ""
echo "2. Buscando cliente..."
CUSTOMER_RESPONSE=$(curl -s -X GET "$API_URL/customers?limit=1" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | jq -r '.data[0].id')
echo "Cliente ID: $CUSTOMER_ID"

# 3. Teste SEM cliente (customerId vazio)
echo ""
echo "3. Testando cupom SEM cliente (customerId vazio)..."
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/coupons/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"code\":\"INDICA20%OFF\",\"subtotal\":100.00,\"customerId\":\"\"}")

echo "Resposta:"
echo $VALIDATE_RESPONSE | jq '.'

# 4. Teste COM cliente
echo ""
echo "4. Testando cupom COM cliente válido..."
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/coupons/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"code\":\"INDICA20%OFF\",\"subtotal\":100.00,\"customerId\":\"$CUSTOMER_ID\"}")

echo "Resposta:"
echo $VALIDATE_RESPONSE | jq '.'

echo ""
echo "=== TESTES CONCLUÍDOS ==="
