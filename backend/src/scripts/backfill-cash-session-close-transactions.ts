import prisma from '@infrastructure/database/prisma-client';

type Options = {
  dryRun: boolean;
  sessionId?: string;
};

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const opts: Options = { dryRun: args.includes('--dry-run') || args.includes('-n') };

  const sessionArg = args.find((a) => a.startsWith('--session-id='));
  if (sessionArg) {
    opts.sessionId = sessionArg.slice('--session-id='.length).trim();
  }

  return opts;
};

const dateOnlyUTC = (dt: Date): Date => {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
};

const main = async () => {
  const options = parseArgs();

  let revenueCategory = await prisma.financialCategory.findFirst({
    where: { name: 'Vendas' },
    select: { id: true, isActive: true, categoryType: true },
  });

  if (!revenueCategory) {
    revenueCategory = await prisma.financialCategory.create({
      data: {
        name: 'Vendas',
        categoryType: 'revenue',
        dreGroup: 'gross_revenue',
        isActive: true,
      },
      select: { id: true, isActive: true, categoryType: true },
    });
  }

  if (!revenueCategory.isActive || revenueCategory.categoryType !== 'revenue') {
    throw new Error('Categoria "Vendas" está inativa ou não é do tipo revenue.');
  }

  const sessions = await prisma.cashSession.findMany({
    where: {
      ...(options.sessionId ? { id: options.sessionId } : {}),
      status: { in: ['cashier_closed', 'manager_closed'] },
      totalSales: { gt: 0 },
    },
    orderBy: { openedAt: 'desc' },
    select: {
      id: true,
      sessionNumber: true,
      terminalId: true,
      openedAt: true,
      cashierClosedAt: true,
      managerClosedAt: true,
      totalSales: true,
      openedById: true,
      cashierClosedById: true,
      managerClosedById: true,
    },
  });

  const report = {
    dryRun: options.dryRun,
    sessionId: options.sessionId ?? null,
    scanned: sessions.length,
    created: 0,
    skippedExisting: 0,
    rows: [] as Array<{ cashSessionId: string; totalSales: number; financialTransactionId?: string }>,
  };

  for (const session of sessions) {
    const referenceNumber = `CASHSESSION-${session.id}`;

    const existing = await prisma.financialTransaction.findFirst({
      where: { referenceNumber },
      select: { id: true },
    });

    if (existing) {
      report.skippedExisting++;
      report.rows.push({
        cashSessionId: session.id,
        totalSales: Number(session.totalSales),
        financialTransactionId: existing.id,
      });
      continue;
    }

    const createdById = session.cashierClosedById ?? session.managerClosedById ?? session.openedById;
    const closedAt = session.cashierClosedAt ?? session.managerClosedAt ?? session.openedAt ?? new Date();

    if (options.dryRun) {
      report.created++;
      report.rows.push({ cashSessionId: session.id, totalSales: Number(session.totalSales) });
      continue;
    }

    const tx = await prisma.financialTransaction.create({
      data: {
        categoryId: revenueCategory.id,
        transactionType: 'revenue',
        amount: Number(session.totalSales),
        description: `Fechamento de Caixa #${session.sessionNumber} (${session.terminalId || 'Terminal'})`,
        referenceNumber,
        transactionDate: dateOnlyUTC(closedAt),
        dueDate: dateOnlyUTC(closedAt),
        paidAt: closedAt,
        status: 'paid',
        createdById,
        tags: ['cash_session_close', 'backfill'],
      },
      select: { id: true },
    });

    report.created++;
    report.rows.push({ cashSessionId: session.id, totalSales: Number(session.totalSales), financialTransactionId: tx.id });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
};

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
