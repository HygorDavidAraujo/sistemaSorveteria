#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
EMAIL="hygordavidaraujo@gmail.com"
PASSWORD="admin123"

echo "🔐 Realizando login..."

# Login and capture token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract token using jq (if available) or grep
if command -v jq &> /dev/null; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
else
  # Fallback if jq is not available
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "🧪 Test 1: Calculating fee with subtotal = 0"
echo "   Request body: {\"neighborhood\": \"Setor Central\", \"city\": \"Goiânia\", \"subtotal\": 0}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/delivery/calculate-fee" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"neighborhood": "Setor Central", "city": "Goiânia", "subtotal": 0}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ✅ SUCCESS - Fee calculated"
elif [ "$HTTP_CODE" -eq 400 ]; then
  echo "   ✅ PARTIAL SUCCESS - Validation passed (400 is business logic error)"
  echo "   This means subtotal=0 is now accepted!"
elif [ "$HTTP_CODE" -eq 422 ]; then
  echo "   ❌ FAILED - Still getting 422 Unprocessable Entity"
else
  echo "   ❓ Unexpected status code"
fi

echo ""
echo "🧪 Test 2: Calculating fee with subtotal = 50"
echo "   Request body: {\"neighborhood\": \"Setor Central\", \"city\": \"Goiânia\", \"subtotal\": 50}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/delivery/calculate-fee" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"neighborhood": "Setor Central", "city": "Goiânia", "subtotal": 50}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ✅ SUCCESS"
else
  echo "   Status: $HTTP_CODE"
fi
