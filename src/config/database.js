const { Sequelize } = require('sequelize');

// Configuración de Sequelize equivalente a Spring Boot JPA
const sequelize = new Sequelize({
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
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
    timezone: '+00:00'
  },
  timezone: '+00:00'
});

// Test de conexión
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  testConnection
};