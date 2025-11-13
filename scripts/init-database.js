const { sequelize } = require('../src/config/database');
const { User, Role, VerificationToken } = require('../src/models');

async function initializeDatabase() {
  try {
    console.log('� Conectando a la base de datos...');
    
    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Insertar rol USER si no existe
    console.log('🔄 Verificando rol USER...');
    const [userRole, created] = await Role.findOrCreate({
      where: { name: 'ROLE_USER' },
      defaults: { name: 'ROLE_USER' }
    });
    
    if (created) {
      console.log('✅ Rol USER creado exitosamente');
    } else {
      console.log('ℹ️ Rol USER ya existe');
    }
    
    // Verificar estructura de tablas
    console.log('🔄 Verificando estructura de tablas...');
    
    const userCount = await User.count();
    const roleCount = await Role.count();
    const tokenCount = await VerificationToken.count();
    
    console.log(`📊 Estadísticas de la base de datos:
    - Usuarios: ${userCount}
    - Roles: ${roleCount}
    - Tokens de verificación: ${tokenCount}`);
    
    console.log('✅ Inicialización completada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    console.error('Detalles del error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;