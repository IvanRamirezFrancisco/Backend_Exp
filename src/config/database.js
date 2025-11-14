const { Sequelize } = require('sequelize');

// Configuración de Sequelize para Railway MySQL
const sequelize = new Sequelize({
  host: process.env.MYSQLHOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT) || 3306,
  database: process.env.MYSQLDATABASE || 'auth_db',
  username: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'password',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  dialectOptions: {
    charset: 'utf8mb4',
    timezone: '+00:00',
    // Configuración SSL para Railway
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  timezone: '+00:00'
});

// Test de conexión con más debug
async function testConnection() {
  try {
    // Debug para Railway
    console.log('🔍 Variables de conexión MySQL:');
    console.log('MYSQLHOST:', process.env.MYSQLHOST);
    console.log('MYSQLPORT:', process.env.MYSQLPORT);
    console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
    console.log('MYSQLUSER:', process.env.MYSQLUSER);
    console.log('MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? '***configurada***' : 'NO CONFIGURADA');
    
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error.message);
    console.error('❌ Error completo:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  testConnection
};