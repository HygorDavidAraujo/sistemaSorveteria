const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixScalePort() {
  try {
    console.log('Verificando configuração da balança...');
    
    // Buscar configuração existente
    const scaleConfig = await prisma.scaleConfig.findFirst();
    
    if (!scaleConfig) {
      console.log('Nenhuma configuração de balança encontrada no banco.');
      return;
    }
    
    console.log('Configuração atual:', {
      port: scaleConfig.port,
      isEnabled: scaleConfig.isEnabled,
    });
    
    // Se a porta for Linux (/dev/tty*), atualizar para Windows (COM3)
    if (scaleConfig.port.startsWith('/dev/')) {
      console.log('\n🔧 Atualizando porta Linux para Windows...');
      
      await prisma.scaleConfig.update({
        where: { id: scaleConfig.id },
        data: {
          port: 'COM3',
          isEnabled: false, // Desabilitar até configurar a porta correta
        },
      });
      
      console.log('✅ Configuração atualizada:');
      console.log('   - Porta: COM3');
      console.log('   - Habilitada: false (configure a porta correta antes de habilitar)');
    } else {
      console.log('✅ Porta já está configurada para Windows:', scaleConfig.port);
    }
    
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixScalePort();
