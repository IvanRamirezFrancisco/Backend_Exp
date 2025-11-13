const express = require('express');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/test/public - Endpoint público (sin autenticación)
router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'Contenido público accesible sin autenticación',
    timestamp: new Date().toISOString(),
    server: 'Node.js + Express'
  });
});

// GET /api/test/user - Endpoint que requiere autenticación
router.get('/user', authenticateToken, requireUser, (req, res) => {
  res.json({
    success: true,
    message: 'Contenido para usuarios autenticados',
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      roles: req.user.roles
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/test/admin - Endpoint que requiere role ADMIN
router.get('/admin', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Contenido exclusivo para administradores',
    user: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/test/profile - Perfil completo del usuario
router.get('/profile', authenticateToken, requireUser, (req, res) => {
  res.json({
    success: true,
    message: 'Perfil completo del usuario',
    profile: {
      ...req.user,
      lastLogin: new Date().toISOString(),
      serverInfo: {
        platform: 'Node.js',
        framework: 'Express',
        version: '1.0.0'
      }
    }
  });
});

// POST /api/test/echo - Echo de datos (para testing)
router.post('/echo', (req, res) => {
  res.json({
    success: true,
    message: 'Echo endpoint',
    receivedData: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? 'Bearer [PRESENT]' : 'Not provided'
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/test/health - Health check detallado
router.get('/health', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // Test de conectividad a la base de datos
    await sequelize.authenticate();
    
    res.json({
      success: true,
      status: 'healthy',
      checks: {
        database: 'connected',
        server: 'running',
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      checks: {
        database: 'disconnected',
        server: 'running',
        environment: process.env.NODE_ENV || 'development'
      },
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;