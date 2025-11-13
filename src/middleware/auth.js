const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar JWT - equivalente a Spring Security
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth Header:', authHeader);
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);
    
    // Buscar el usuario en la base de datos
    const user = await User.findByPk(decoded.userId, {
      include: ['roles']
    });

    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User roles:', user?.roles?.map(role => role.name) || []);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (!user.enabled) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta deshabilitada'
      });
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.roles?.map(role => role.name) || [],
      twoFactorEnabled: user.two_factor_enabled
    };

    console.log('Request user set:', req.user);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware opcional de autenticación
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        include: ['roles']
      });

      if (user && user.enabled) {
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: user.roles?.map(role => role.name) || [],
          twoFactorEnabled: user.two_factor_enabled
        };
      }
    }

    next();
  } catch (error) {
    // En autenticación opcional, ignoramos errores de token
    next();
  }
};

// Middleware para verificar roles - equivalente a @PreAuthorize
const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('RequireRole middleware - Required roles:', roles);
    console.log('RequireRole middleware - User:', req.user);

    if (!req.user) {
      console.log('No user in request');
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const userRoles = req.user.roles || [];
    console.log('User roles:', userRoles);
    
    const hasRequiredRole = roles.some(role => 
      userRoles.includes(role) || 
      userRoles.includes(role.toUpperCase()) ||
      userRoles.includes(`ROLE_${role}`) ||
      userRoles.includes(`ROLE_${role.toUpperCase()}`)
    );

    console.log('Has required role:', hasRequiredRole);

    if (!hasRequiredRole) {
      console.log('Insufficient permissions');
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    console.log('Role check passed, proceeding...');
    next();
  };
};

// Shorthand para requerir role USER
const requireUser = requireRole(['USER', 'ADMIN']);

// Shorthand para requerir role ADMIN
const requireAdmin = requireRole(['ADMIN']);

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireUser,
  requireAdmin
};