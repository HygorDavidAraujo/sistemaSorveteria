#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
EMAIL="hygordavidaraujo@gmail.com"
PASSWORD="admin123"

echo "🔐 Realizando login..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful: $TOKEN"

echo ""
echo "📋 Testando múltiplas requisições rápidas ao endpoint /loyalty/config..."

SUCCESS_COUNT=0
ERROR_COUNT=0
RATE_LIMIT_ERRORS=0

# Make 10 rapid requests
for i in {1..10}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/loyalty/config" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Requisição $i: Sucesso ($HTTP_CODE)"
    ((SUCCESS_COUNT++))
  elif [ "$HTTP_CODE" -eq 429 ]; then
    echo "❌ Requisição $i: 429 Too Many Requests (Rate Limit)"
    ((RATE_LIMIT_ERRORS++))
    ((ERROR_COUNT++))
  else
    echo "❌ Requisição $i: Erro $HTTP_CODE"
    ((ERROR_COUNT++))
  fi
  
  sleep 0.1
done

echo ""
echo "📊 Resultado do teste:"
echo "   Requisições bem-sucedidas: $SUCCESS_COUNT/10"
echo "   Erros de Taxa Limite (429): $RATE_LIMIT_ERRORS"
echo "   Total de erros: $ERROR_COUNT"

if [ $RATE_LIMIT_ERRORS -eq 0 ] && [ $ERROR_COUNT -eq 0 ]; then
  echo ""
  echo "🎉 TESTE PASSADO: Nenhum erro de taxa limite detectado!"
  exit 0
else
  echo ""
  echo "⚠️  TESTE FALHOU: Rate limit ou outros erros foram detectados"
  exit 1
fi
