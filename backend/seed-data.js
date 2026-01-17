const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Create default financial categories
    console.log('💰 Creating financial categories...');
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
        create: category,
      });
    }
    console.log('✓ Financial categories created\n');

    // Create default loyalty configuration
    console.log('🎁 Creating loyalty configuration...');
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
    console.log('✓ Loyalty configuration created\n');

    // Create default cashback configuration
    console.log('💵 Creating cashback configuration...');
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
    console.log('✓ Cashback configuration created\n');

    // Create sample product categories
    console.log('📦 Creating product categories...');
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
    console.log('✓ Product categories created\n');

    console.log('✅ Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
