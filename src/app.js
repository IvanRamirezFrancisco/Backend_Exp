require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('express-async-errors');

// Importar configuraciones
const { sequelize } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');
const DatabaseSeeder = require('./utils/databaseSeeder');

// Importar rutas
const authRoutes = require('./routes/auth');
const twoFactorRoutes = require('./routes/twoFactor');
const passwordResetRoutes = require('./routes/passwordReset');
const testRoutes = require('./routes/test');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de middlewares globales
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Configuración CORS - Compatible con desarrollo y producción
const allowedOrigins = [
  'http://localhost:5173', // Desarrollo Vite
  'http://localhost:5174', // Desarrollo Vite alternativo
  'http://localhost:5175', // Desarrollo Vite alternativo
  'http://localhost:4200', // Angular (compatibilidad)
];

// Agregar origen de producción si está definido
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Agregar dominios Railway comunes
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push('https://frontendexp-production.up.railway.app'); // Frontend actual
  allowedOrigins.push('https://frontendmig-production.up.railway.app');
  allowedOrigins.push('https://fronlogin-production.up.railway.app');
  allowedOrigins.push(/^https:\/\/.*\.railway\.app$/); // Cualquier subdominio Railway
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - DESHABILITADO para pruebas de la maestra
app.use(rateLimitMiddleware); // Middleware modificado para permitir todas las peticiones

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/auth', passwordResetRoutes); // Password reset bajo /api/auth como en Spring Boot
app.use('/api/test', testRoutes);
app.use('/api/fix', require('./routes/fix')); // Temporal para arreglar roles

// Health check endpoint
app.get('/actuator/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'auth-system-nodejs',
    version: '1.0.0'
  });
});

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: 'AuthSystem API - Node.js Migration',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/auth/*',
      '/api/2fa/*',
      '/actuator/health'
    ]
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Función para iniciar el servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
    
    // NO sincronizar modelos ya que la base de datos existe de Spring Boot
    // Solo verificar que podemos conectarnos y usar los modelos
    console.log('⚠️ Usando base de datos existente, omitiendo sincronización de modelos.');
    
    // Inicializar datos básicos (roles, admin por defecto)
    // DESHABILITADO: La base de datos ya existe con datos de Spring Boot
    // await DatabaseSeeder.initialize();
    console.log('⚠️ Seeding omitido - usando base de datos existente de Spring Boot.');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📧 Frontend URL configurado: ${process.env.FRONTEND_URL}`);
      console.log(`🔐 JWT Secret configurado: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
      console.log(`📨 Brevo API Key: ${process.env.BREVO_API_KEY ? '✅' : '❌'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('⏹️ Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️ Cerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

// Iniciar la aplicación
startServer();

module.exports = app;