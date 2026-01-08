import prisma from '../src/infrastructure/database/prisma-client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'hygordavidaraujo@gmail.com' },
    update: {},
    create: {
      email: 'hygordavidaraujo@gmail.com',
      passwordHash: adminPassword,
      fullName: 'Administrador',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('✓ Admin user created:', admin.email);

  // Create default financial categories
  const categories = [
    // Revenue
    { name: 'Vendas Balcão', categoryType: 'revenue', dreGroup: 'sales' },
    { name: 'Vendas Comanda', categoryType: 'revenue', dreGroup: 'sales' },
    { name: 'Vendas Delivery', categoryType: 'revenue', dreGroup: 'sales' },

    // Costs
    { name: 'Custo de Produtos (CPV)', categoryType: 'cost', dreGroup: 'cogs' },
    { name: 'Taxas de Cartão', categoryType: 'cost', dreGroup: 'cogs' },

    // Fixed Expenses
    { name: 'Aluguel', categoryType: 'expense', dreGroup: 'fixed_expenses' },
    { name: 'Salários e Encargos', categoryType: 'expense', dreGroup: 'fixed_expenses' },
    { name: 'Energia Elétrica', categoryType: 'expense', dreGroup: 'fixed_expenses' },
    { name: 'Água', categoryType: 'expense', dreGroup: 'fixed_expenses' },
    { name: 'Internet e Telefone', categoryType: 'expense', dreGroup: 'fixed_expenses' },
    { name: 'Contabilidade', categoryType: 'expense', dreGroup: 'fixed_expenses' },

    // Variable Expenses
    { name: 'Embalagens', categoryType: 'expense', dreGroup: 'variable_expenses' },
    { name: 'Marketing e Publicidade', categoryType: 'expense', dreGroup: 'variable_expenses' },
    { name: 'Delivery e Frete', categoryType: 'expense', dreGroup: 'variable_expenses' },
    { name: 'Manutenção', categoryType: 'expense', dreGroup: 'variable_expenses' },
    { name: 'Material de Limpeza', categoryType: 'expense', dreGroup: 'variable_expenses' },
  ];

  for (const category of categories) {
    await prisma.financialCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category as any,
    });
  }

  console.log('✓ Financial categories created');

  // Create default loyalty configuration (apply to all products)
  await prisma.loyaltyConfig.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      pointsPerReal: 1,
      minPurchaseForPoints: 10,
      pointsExpirationDays: 365,
      minPointsToRedeem: 100,
      pointsRedemptionValue: 0.01,
      applyToAllProducts: true,
      isActive: true,
    },
  });

  console.log('✓ Loyalty configuration created');

  // Create default cashback configuration
  await prisma.cashbackConfig.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      cashbackPercentage: 5,
      minPurchaseForCashback: 20,
      maxCashbackPerPurchase: 20,
      cashbackExpirationDays: 180,
      minCashbackToUse: 5,
      applyToAllProducts: true,
      isActive: true,
    },
  });

  console.log('✓ Cashback configuration created');

  // Create sample product categories
  const categoriesProduct = [
    { name: 'Sorvetes', description: 'Sorvetes artesanais' },
    { name: 'Açaí', description: 'Açaí e complementos' },
    { name: 'Picolés', description: 'Picolés variados' },
    { name: 'Bebidas', description: 'Refrigerantes e sucos' },
    { name: 'Confeitos', description: 'Balas, chocolates, etc' },
  ];

  for (const cat of categoriesProduct) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('✓ Product categories created');

  // Create sample products
  const sorvetesCategory = await prisma.category.findUnique({
    where: { name: 'Sorvetes' },
  });

  if (sorvetesCategory) {
    const products = [
      {
        name: 'Sorvete de Chocolate',
        code: 'SORV001',
        categoryId: sorvetesCategory.id,
        salePrice: 12.00,
        costPrice: 5.00,
        saleType: 'unit',
        unit: 'un',
        eligibleForLoyalty: true,
        earnsCashback: true,
        cashbackPercentage: 5,
        isActive: true,
        createdById: admin.id,
      },
      {
        name: 'Sorvete de Morango',
        code: 'SORV002',
        categoryId: sorvetesCategory.id,
        salePrice: 12.00,
        costPrice: 5.00,
        saleType: 'unit',
        unit: 'un',
        eligibleForLoyalty: true,
        earnsCashback: true,
        cashbackPercentage: 5,
        isActive: true,
        createdById: admin.id,
      },
      {
        name: 'Sorvete por Peso',
        code: 'SORVKG',
        categoryId: sorvetesCategory.id,
        salePrice: 45.00,
        costPrice: 18.00,
        saleType: 'weight',
        unit: 'kg',
        eligibleForLoyalty: true,
        earnsCashback: true,
        cashbackPercentage: 5,
        isActive: true,
        createdById: admin.id,
      },
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { code: product.code },
        update: {},
        create: product as any,
      });
    }

    console.log('✓ Sample products created');

    // Note: Cash sessions should be created manually by users
    // Removing automatic session creation to prevent duplicate sessions

    /*
    // Create sample cash session and sales
    const cashSession = await prisma.cashSession.create({
      data: {
        terminalId: 'CAIXA-01',
        openedById: admin.id,
        initialCash: 200.0,
        openingNotes: 'Abertura automática - seed',
        status: 'open',
      },
    });

    console.log('✓ Sample cash session created');

    // Create sample sales with payments
    const sale1 = await prisma.sale.create({
      data: {
        cashSessionId: cashSession.id,
        saleType: 'pdv',
        subtotal: 36.0,
        total: 36.0,
        status: 'completed',
        createdById: admin.id,
        items: {
          create: [
            {
              productId: (await prisma.product.findFirst({ where: { code: 'SORV001' } }))!.id,
              productName: 'Sorvete de Chocolate',
              quantity: 2,
              unitPrice: 12.0,
              costPrice: 5.0,
              subtotal: 24.0,
              total: 24.0,
              loyaltyPointsEarned: 24,
            },
            {
              productId: (await prisma.product.findFirst({ where: { code: 'SORV002' } }))!.id,
              productName: 'Sorvete de Morango',
              quantity: 1,
              unitPrice: 12.0,
              costPrice: 5.0,
              subtotal: 12.0,
              total: 12.0,
              loyaltyPointsEarned: 12,
            },
          ],
        },
        payments: {
          create: [
            {
              paymentMethod: 'cash',
              amount: 36.0,
            },
          ],
        },
      },
    });

    const sale2 = await prisma.sale.create({
      data: {
        cashSessionId: cashSession.id,
        saleType: 'pdv',
        subtotal: 45.0,
        total: 45.0,
        status: 'completed',
        createdById: admin.id,
        items: {
          create: [
            {
              productId: (await prisma.product.findFirst({ where: { code: 'SORVKG' } }))!.id,
              productName: 'Sorvete por Peso',
              quantity: 1,
              unitPrice: 45.0,
              costPrice: 18.0,
              subtotal: 45.0,
              total: 45.0,
              loyaltyPointsEarned: 45,
            },
          ],
        },
        payments: {
          create: [
            {
              paymentMethod: 'pix',
              amount: 45.0,
              pixKey: 'contato@gelatini.com',
            },
          ],
        },
      },
    });

    const sale3 = await prisma.sale.create({
      data: {
        cashSessionId: cashSession.id,
        saleType: 'pdv',
        subtotal: 24.0,
        total: 24.0,
        status: 'completed',
        createdById: admin.id,
        items: {
          create: [
            {
              productId: (await prisma.product.findFirst({ where: { code: 'SORV001' } }))!.id,
              productName: 'Sorvete de Chocolate',
              quantity: 2,
              unitPrice: 12.0,
              costPrice: 5.0,
              subtotal: 24.0,
              total: 24.0,
              loyaltyPointsEarned: 24,
            },
          ],
        },
        payments: {
          create: [
            {
              paymentMethod: 'credit_card',
              amount: 24.0,
              cardBrand: 'Visa',
              cardLastDigits: '4321',
            },
          ],
        },
      },
    });

    console.log('✓ Sample sales created');

    // Update cash session totals
    await prisma.cashSession.update({
      where: { id: cashSession.id },
      data: {
        totalSales: 105.0,
        totalCash: 36.0,
        totalCard: 24.0,
        totalPix: 45.0,
        totalOther: 0,
      },
    });

    console.log('✓ Cash session totals updated');*/
  }

  console.log('🎉 Database seeding completed!');
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
