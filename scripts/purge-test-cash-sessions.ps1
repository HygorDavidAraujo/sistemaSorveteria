$ErrorActionPreference = 'Stop'

Write-Host "Removendo caixas de TESTE (T1, TERM-001, PDV-TESTE, PDV-TEST) e seus dados (sales/comandas/delivery)..." -ForegroundColor Cyan

$js = @'
const { PrismaClient } = require('@prisma/client');

const terminals = ['T1', 'TERM-001', 'PDV-TESTE', 'PDV-TEST'];

(async () => {
  const prisma = new PrismaClient();
  try {
    const sessions = await prisma.cashSession.findMany({
      where: { terminalId: { in: terminals } },
      select: { id: true, terminalId: true, status: true, openedAt: true },
      orderBy: { openedAt: 'asc' },
    });

    const report = {
      terminals,
      foundSessions: sessions.length,
      perSession: [],
    };

    for (const s of sessions) {
      const entry = {
        cashSessionId: s.id,
        terminalId: s.terminalId,
        status: s.status,
        openedAt: s.openedAt,
        deleted: {
          financialTransactions: 0,
          accountReceivable: 0,
          saleAdjustments: 0,
          sales: 0,
          comandas: 0,
          deliveryOrders: 0,
          cashSessionPayments: 0,
          cashSession: 0,
        },
      };

      await prisma.$transaction(async (tx) => {
        const sales = await tx.sale.findMany({
          where: { cashSessionId: s.id },
          select: { id: true },
        });
        const saleIds = sales.map((x) => x.id);

        if (saleIds.length) {
          entry.deleted.financialTransactions = (await tx.financialTransaction.deleteMany({
            where: { saleId: { in: saleIds } },
          })).count;

          entry.deleted.accountReceivable = (await tx.accountReceivable.deleteMany({
            where: { saleId: { in: saleIds } },
          })).count;

          entry.deleted.saleAdjustments = (await tx.saleAdjustment.deleteMany({
            where: { saleId: { in: saleIds } },
          })).count;

          entry.deleted.sales = (await tx.sale.deleteMany({
            where: { id: { in: saleIds } },
          })).count;
        }

        entry.deleted.comandas = (await tx.comanda.deleteMany({
          where: { cashSessionId: s.id },
        })).count;

        entry.deleted.deliveryOrders = (await tx.deliveryOrder.deleteMany({
          where: { cashSessionId: s.id },
        })).count;

        entry.deleted.cashSessionPayments = (await tx.cashSessionPayment.deleteMany({
          where: { cashSessionId: s.id },
        })).count;

        await tx.cashSession.delete({ where: { id: s.id } });
        entry.deleted.cashSession = 1;
      });

      report.perSession.push(entry);
    }

    // Sanity check: ensure nothing remains
    const remaining = await prisma.cashSession.findMany({
      where: { terminalId: { in: terminals } },
      select: { id: true, terminalId: true, status: true, openedAt: true },
    });

    report.remainingSessions = remaining;

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
'@

$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
$cmd = 'node -e "eval(Buffer.from(' + "'$encoded'" + ',\"base64\").toString(\"utf8\"))"'

docker exec gelatini-backend sh -lc "$cmd"
