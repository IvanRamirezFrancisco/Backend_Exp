const { sequelize } = require('../src/config/database');
const { VerificationToken, User } = require('../src/models');

async function verifyTokenDirect(token) {
  try {
    console.log('🔍 Verificando token:', token);
    
    await sequelize.authenticate();
    console.log('✅ Conexión a DB establecida');
    
    // Buscar el token
    const verificationToken = await VerificationToken.findOne({
      where: { 
        token: token,
        used: false 
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!verificationToken) {
      console.log('❌ Token no encontrado o ya usado');
      return false;
    }

    // Verificar si ha expirado
    if (new Date() > verificationToken.expiry_date) {
      console.log('❌ Token expirado');
      return false;
    }

    console.log('✅ Token válido para usuario:', verificationToken.user.email);
    
    // Activar el usuario y marcar token como usado
    await verificationToken.user.update({ enabled: true });
    await verificationToken.update({ used: true });
    
    console.log('✅ Usuario activado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const token = process.argv[2];
  if (!token) {
    console.log('Uso: node verify-token.js <token>');
    process.exit(1);
  }
  
  verifyTokenDirect(token).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = verifyTokenDirect;