const express = require('express');
const { body, validationResult } = require('express-validator');
const PasswordResetService = require('../services/PasswordResetService');

const router = express.Router();

// Helper para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// POST /api/auth/forgot-password - Solicitar reset de contraseña
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido')
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.query.email ? req.query : req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    // Obtener IP del usuario para logging de seguridad
    const userIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                  (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'Unknown';

    const success = await PasswordResetService.requestPasswordReset(email, userIP);

    // Por seguridad, siempre devolvemos el mismo mensaje independientemente de si el email existe
    return res.json({
      success: true,
      message: 'Si el email está registrado y verificado, recibirás un enlace de recuperación en tu bandeja de entrada.'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor. Intenta nuevamente más tarde.'
    });
  }
});

// GET /api/auth/validate-reset-token - Validar token de reset
router.get('/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const isValid = await PasswordResetService.validateResetToken(token);

    if (isValid) {
      return res.json({
        success: true,
        message: 'Token válido'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'El enlace de reset ha expirado o es inválido. Solicita uno nuevo.'
      });
    }

  } catch (error) {
    console.error('Error validando token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar el token'
    });
  }
});

// POST /api/auth/reset-password - Resetear contraseña
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requerido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    let { token, password } = req.body;
    
    // También aceptar parámetros de query (como en Spring Boot)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    if (!password && req.query.password) {
      password = req.query.password;
    }

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token y contraseña requeridos'
      });
    }

    // Validar que la contraseña no esté vacía
    if (password.trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const success = await PasswordResetService.resetPassword(token, password);

    if (success) {
      return res.json({
        success: true,
        message: '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'El enlace de reset ha expirado o es inválido. Solicita uno nuevo.'
      });
    }

  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la contraseña. Intenta nuevamente.'
    });
  }
});

// GET /api/auth/reset-token-info/:token - Información del token (para debugging)
router.get('/reset-token-info/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const user = await PasswordResetService.getUserByToken(token);
    
    if (user) {
      return res.json({
        success: true,
        message: 'Token encontrado',
        data: {
          email: user.email,
          firstName: user.first_name,
          valid: true
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Token no encontrado o inválido'
      });
    }

  } catch (error) {
    console.error('Error obteniendo info del token:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/cleanup-expired-tokens - Limpiar tokens expirados (administrativo)
router.post('/cleanup-expired-tokens', async (req, res) => {
  try {
    const count = await PasswordResetService.cleanupExpiredTokens();
    
    return res.json({
      success: true,
      message: `${count} tokens expirados eliminados`,
      data: { cleanedTokens: count }
    });
    
  } catch (error) {
    console.error('Error limpiando tokens:', error);
    return res.status(500).json({
      success: false,
      message: 'Error limpiando tokens expirados'
    });
  }
});

// GET /api/auth/user-tokens/:email - Contar tokens activos de usuario
router.get('/user-tokens/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    const count = await PasswordResetService.getActiveTokensCount(email);
    
    return res.json({
      success: true,
      message: 'Tokens activos obtenidos',
      data: { activeTokens: count }
    });
    
  } catch (error) {
    console.error('Error contando tokens:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo tokens activos'
    });
  }
});

module.exports = router;