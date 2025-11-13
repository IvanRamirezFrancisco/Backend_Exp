const { Role, User } = require('../models');
const bcrypt = require('bcryptjs');

class DatabaseSeeder {
  // Inicializar roles básicos
  static async seedRoles() {
    try {
      console.log('🌱 Inicializando roles...');
      
      const roles = ['USER', 'ADMIN', 'MODERATOR'];
      
      for (const roleName of roles) {
        const [role, created] = await Role.findOrCreate({
          where: { name: roleName },
          defaults: { name: roleName }
        });
        
        if (created) {
          console.log(`✅ Rol creado: ${roleName}`);
        } else {
          console.log(`ℹ️  Rol ya existe: ${roleName}`);
        }
      }
      
      console.log('✅ Roles inicializados correctamente');
    } catch (error) {
      console.error('❌ Error inicializando roles:', error);
      throw error;
    }
  }

  // Crear usuario administrador por defecto (opcional)
  static async createDefaultAdmin() {
    try {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@authsystem.com';
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';

      console.log('🔐 Verificando usuario administrador...');

      const existingAdmin = await User.findOne({ where: { email: adminEmail } });
      
      if (existingAdmin) {
        console.log('ℹ️  Usuario administrador ya existe');
        return;
      }

      // Crear usuario administrador
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = await User.create({
        first_name: 'Admin',
        last_name: 'System',
        email: adminEmail,
        password: hashedPassword,
        enabled: true,
        email_enabled: true
      });

      // Asignar role ADMIN
      const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
      if (adminRole) {
        await admin.addRole(adminRole);
      }

      console.log(`✅ Usuario administrador creado: ${adminEmail}`);
      console.log(`🔑 Contraseña inicial: ${adminPassword}`);
      console.log('⚠️  ¡Cambia la contraseña después del primer login!');

    } catch (error) {
      console.error('❌ Error creando administrador:', error);
      // No lanzar error aquí para que no interrumpa el inicio de la app
    }
  }

  // Ejecutar toda la inicialización
  static async initialize() {
    try {
      console.log('🚀 Iniciando seeding de la base de datos...');
      
      await this.seedRoles();
      
      // Solo crear admin por defecto en desarrollo
      if (process.env.NODE_ENV === 'development' || process.env.CREATE_DEFAULT_ADMIN === 'true') {
        await this.createDefaultAdmin();
      }
      
      console.log('✅ Database seeding completado');
    } catch (error) {
      console.error('❌ Error en database seeding:', error);
      throw error;
    }
  }
}

module.exports = DatabaseSeeder;