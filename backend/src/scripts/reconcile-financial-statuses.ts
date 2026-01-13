import prisma from '@infrastructure/database/prisma-client';
import type { TransactionStatus } from '@prisma/client';

type ReconcileOptions = {
  dryRun: boolean;
  cancelDuplicates: boolean;
};

const parseArgs = (): ReconcileOptions => {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run') || args.has('-n'),
    cancelDuplicates: args.has('--cancel-duplicates'),
  };
};

const dateOnlyUTC = (dt: Date): Date => {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
};

const shouldSyncAccountStatus = (status: TransactionStatus) =>
  status === 'paid' || status === 'cancelled';

const reconcilePayables = async (options: ReconcileOptions) => {
  const accounts = await prisma.accountPayable.findMany({
    where: {
      status: { in: ['paid', 'cancelled'] },
    },
    select: {
      id: true,
      status: true,
      paidAt: true,
    },
  });

  let updated = 0;
  let created = 0;
  let duplicatesCancelled = 0;

  for (const ap of accounts) {
    if (!shouldSyncAccountStatus(ap.status)) continue;

    const refMain = ap.id;
    const refLegacy = `PAYMENT-${ap.id}`;

    const txs = await prisma.financialTransaction.findMany({
      where: {
        OR: [{ referenceNumber: refMain }, { referenceNumber: refLegacy }],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        paidAt: true,
        transactionDate: true,
      },
    });

    const txMain = txs.find((t) => t.referenceNumber === refMain) ?? null;
    const txLegacy = txs.filter((t) => t.referenceNumber === refLegacy);

    const desiredPaidAt = ap.status === 'paid' ? ap.paidAt ?? null : null;
    const desiredTransactionDate =
      ap.status === 'paid' && desiredPaidAt ? dateOnlyUTC(desiredPaidAt) : undefined;

    const syncTx = async (txId: string) => {
      const data: any = {
        status: ap.status,
      };

      if (ap.status === 'paid') {
        data.paidAt = desiredPaidAt;
        if (desiredTransactionDate) data.transactionDate = desiredTransactionDate;
      }

      if (ap.status === 'cancelled') {
        data.paidAt = null;
      }

      if (options.dryRun) return;
      await prisma.financialTransaction.update({ where: { id: txId }, data });
    };

    if (txMain) {
      if (txMain.status !== ap.status || (ap.status === 'paid' && !txMain.paidAt && desiredPaidAt)) {
        await syncTx(txMain.id);
        updated += 1;
      }

      if (options.cancelDuplicates && txLegacy.length > 0) {
        for (const dup of txLegacy) {
          if (dup.status === 'cancelled') continue;
          if (!options.dryRun) {
            await prisma.financialTransaction.update({
              where: { id: dup.id },
              data: { status: 'cancelled', paidAt: null },
            });
          }
          duplicatesCancelled += 1;
        }
      }
      continue;
    }

    // No main transaction found.
    if (txLegacy.length > 0) {
      // If we have legacy payment records, just sync their status to avoid "pending" artifacts.
      for (const legacy of txLegacy) {
        if (legacy.status !== ap.status || (ap.status === 'paid' && !legacy.paidAt && desiredPaidAt)) {
          await syncTx(legacy.id);
          updated += 1;
        }
      }
      continue;
    }

    // No related transaction found at all. We can't infer category/amount/description reliably here.
    // Creating rows blindly can cause duplicates in reports, so we only report.
    created += 0;
  }

  return { updated, created, duplicatesCancelled, scanned: accounts.length };
};

const reconcileReceivables = async (options: ReconcileOptions) => {
  const accounts = await prisma.accountReceivable.findMany({
    where: {
      status: { in: ['paid', 'cancelled'] },
    },
    select: {
      id: true,
      status: true,
      receivedAt: true,
    },
  });

  let updated = 0;
  let created = 0;
  let duplicatesCancelled = 0;

  for (const ar of accounts) {
    if (!shouldSyncAccountStatus(ar.status)) continue;

    const refMain = ar.id;
    const refLegacy = `RECEIPT-${ar.id}`;

    const txs = await prisma.financialTransaction.findMany({
      where: {
        OR: [{ referenceNumber: refMain }, { referenceNumber: refLegacy }],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        paidAt: true,
      },
    });

    const txMain = txs.find((t) => t.referenceNumber === refMain) ?? null;
    const txLegacy = txs.filter((t) => t.referenceNumber === refLegacy);

    const desiredPaidAt = ar.status === 'paid' ? ar.receivedAt ?? null : null;
    const desiredTransactionDate =
      ar.status === 'paid' && desiredPaidAt ? dateOnlyUTC(desiredPaidAt) : undefined;

    const syncTx = async (txId: string) => {
      const data: any = {
        status: ar.status,
      };

      if (ar.status === 'paid') {
        data.paidAt = desiredPaidAt;
        if (desiredTransactionDate) data.transactionDate = desiredTransactionDate;
      }

      if (ar.status === 'cancelled') {
        data.paidAt = null;
      }

      if (options.dryRun) return;
      await prisma.financialTransaction.update({ where: { id: txId }, data });
    };

    if (txMain) {
      if (txMain.status !== ar.status || (ar.status === 'paid' && !txMain.paidAt && desiredPaidAt)) {
        await syncTx(txMain.id);
        updated += 1;
      }

      if (options.cancelDuplicates && txLegacy.length > 0) {
        for (const dup of txLegacy) {
          if (dup.status === 'cancelled') continue;
          if (!options.dryRun) {
            await prisma.financialTransaction.update({
              where: { id: dup.id },
              data: { status: 'cancelled', paidAt: null },
            });
          }
          duplicatesCancelled += 1;
        }
      }
      continue;
    }

    if (txLegacy.length > 0) {
      for (const legacy of txLegacy) {
        if (legacy.status !== ar.status || (ar.status === 'paid' && !legacy.paidAt && desiredPaidAt)) {
          await syncTx(legacy.id);
          updated += 1;
        }
      }
      continue;
    }

    created += 0;
  }

  return { updated, created, duplicatesCancelled, scanned: accounts.length };
};

const main = async () => {
  const options = parseArgs();

  const startedAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(
    `[reconcile-financial-statuses] Starting (dryRun=${options.dryRun}, cancelDuplicates=${options.cancelDuplicates})`
  );

  const payables = await reconcilePayables(options);
  const receivables = await reconcileReceivables(options);

  const elapsedMs = Date.now() - startedAt;
  // eslint-disable-next-line no-console
  console.log('[reconcile-financial-statuses] Done');
  // eslint-disable-next-line no-console
  console.log({ payables, receivables, elapsedMs });
};

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[reconcile-financial-statuses] Failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
