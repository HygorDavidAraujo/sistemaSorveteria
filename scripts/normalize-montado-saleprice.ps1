$ErrorActionPreference = 'Stop'

Write-Host "Normalizando salePrice de produtos Montado (salePrice = menor preço por tamanho)..." -ForegroundColor Cyan

# Executa dentro do container do backend para usar o Prisma + .env já configurados
$js = @'
const { PrismaClient } = require('@prisma/client');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

(async () => {
  const prisma = new PrismaClient();
  try {
    const products = await prisma.product.findMany({
      where: {
        category: { is: { categoryType: 'assembled' } },
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        sizePrices: { select: { price: true } },
      },
    });

    let scanned = 0;
    let updated = 0;
    let skippedNoPrices = 0;

    for (const p of products) {
      scanned++;
      const prices = (p.sizePrices || [])
        .map((sp) => Number(sp.price))
        .filter((x) => Number.isFinite(x) && x > 0);

      if (!prices.length) {
        skippedNoPrices++;
        continue;
      }

      const minPrice = round2(Math.min(...prices));
      const current = round2(p.salePrice);

      if (current !== minPrice) {
        await prisma.product.update({
          where: { id: p.id },
          data: { salePrice: minPrice },
        });
        updated++;
      }
    }

    console.log(JSON.stringify({ scanned, updated, skippedNoPrices }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
'@

# PowerShell: passar o JS como argumento único
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
$cmd = 'node -e "eval(Buffer.from(' + "'$encoded'" + ',\"base64\").toString(\"utf8\"))"'

docker exec gelatini-backend sh -lc "$cmd"
