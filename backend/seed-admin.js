const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🌱 Creating admin user...');
    
    const hash = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'hygordavidaraujo@gmail.com' },
      update: { 
        isActive: true,
        passwordHash: hash
      },
      create: { 
        email: 'hygordavidaraujo@gmail.com', 
        passwordHash: hash, 
        fullName: 'Administrador', 
        role: 'admin', 
        isActive: true 
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Role:', admin.role);
    console.log('✓ Active:', admin.isActive);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
