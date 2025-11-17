const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const JwtUtils = require('../utils/jwtUtils');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validaciones robustas para registro
const registerValidation = [
  // Validación de nombre
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios')
    .customSanitizer(value => {
      // Capitalizar primera letra de cada palabra
      return value.replace(/\b\w+/g, word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
    }),

  // Validación de apellido
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[A-Za-zÀ-ÿ\u00f1\u00d1\s]+$/)
    .withMessage('El apellido solo puede contener letras y espacios')
    .customSanitizer(value => {
      // Capitalizar primera letra de cada palabra
      return value.replace(/\b\w+/g, word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
    }),

  // Validación de email
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('Formato de email inválido')
    .normalizeEmail({
      gmail_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false
    })
    .custom(async (email) => {
      // Validación profesional y permisiva para todos los dominios
      const domain = email.split('@')[1];
      
      if (!domain) {
        throw new Error('Formato de email inválido');
      }
      
      // Lista amplia de dominios válidos reconocidos
      const trustedDomains = [
        // Educativos México
        'uthh.edu.mx', 'unam.mx', 'itesm.mx', 'ipn.mx', 'uam.mx', 'tecnm.mx',
        'udg.mx', 'uanl.mx', 'buap.mx', 'uv.mx', 'uat.edu.mx',
        
        // Personales y comerciales
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
        'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com',
        
        // Gubernamentales
        'gob.mx', 'sep.gob.mx', 'salud.gob.mx', 'gov', 'gov.mx'
      ];
      
      // Patrones de dominios válidos
      const validPatterns = [
        /\.edu$/,           // .edu (educativos US)
        /\.edu\.[a-z]{2}$/,  // .edu.mx, .edu.ar, etc.
        /\.ac\.[a-z]{2}$/,   // .ac.uk, etc.
        /\.com$/,           // .com
        /\.com\.[a-z]{2}$/,  // .com.mx, etc.
        /\.org$/,           // .org
        /\.net$/,           // .net
        /\.gov$/,           // .gov
        /\.gob\.[a-z]{2}$/,  // .gob.mx, etc.
        /\.[a-z]{2}$/,      // códigos de país (mx, ar, es, etc.)
      ];
      
      // Verificar si el dominio está en la lista de confianza o sigue un patrón válido
      const isDomainValid = trustedDomains.includes(domain) || 
                           validPatterns.some(pattern => pattern.test(domain));
      
      if (!isDomainValid) {
        // Para dominios desconocidos, verificar estructura básica
        const parts = domain.split('.');
        if (parts.length < 2 || parts.some(part => part.length < 1)) {
          throw new Error('Dominio de email inválido');
        }
      }
      
      // Validación adicional: el email no debe ser demasiado largo
      if (email.length > 100) {
        throw new Error('Email demasiado largo (máximo 100 caracteres)');
      }
      
      return true;
    }),

  // Validación de teléfono (opcional)
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+[1-9]\d{8,14}$/)
    .withMessage('Formato de teléfono inválido. Use formato internacional: +1234567890')
    .customSanitizer(value => {
      // Limpiar espacios y caracteres especiales
      return value ? value.replace(/[\s\-\(\)\.]/g, '') : value;
    }),

  // Validación de contraseña robusta
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$/)
    .withMessage('La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&.)')
    .custom((password, { req }) => {
      // Verificar que no sea una contraseña común
      const commonPasswords = [
        'password', '12345678', 'qwerty123', 'password123', 
        'admin123', '123456789', 'Password1', 'password1', 'welcome123',
        'letmein123', 'admin1234', '1234567890', 'Password@1'
      ];
      
      if (commonPasswords.includes(password.toLowerCase())) {
        throw new Error('La contraseña es demasiado común. Elige una más segura.');
      }
      
      // Verificar que no contenga el email o nombre del usuario
      const email = req.body.email;
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      
      if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
        throw new Error('La contraseña no puede contener tu email.');
      }
      
      if (firstName && password.toLowerCase().includes(firstName.toLowerCase())) {
        throw new Error('La contraseña no puede contener tu nombre.');
      }
      
      if (lastName && password.toLowerCase().includes(lastName.toLowerCase())) {
        throw new Error('La contraseña no puede contener tu apellido.');
      }
      
      // Verificar que no tenga secuencias obvias
      const sequences = ['123456', '654321', 'abcdef', 'fedcba', 'qwerty'];
      if (sequences.some(seq => password.toLowerCase().includes(seq))) {
        throw new Error('La contraseña no puede contener secuencias obvias (123456, qwerty, etc.).');
      }
      
      return true;
    })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
];

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

// POST /api/auth/register - Registro de usuario
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('📝 Datos de registro recibidos:', {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone || 'No proporcionado'
    });

    const user = await AuthService.registerUser(req.body);
    
    console.log('✅ Usuario registrado exitosamente:', user.email);
    
    res.json({
      success: true,
      message: 'Usuario registrado exitosamente. Por favor, verifica tu email para activar tu cuenta.',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        requiresEmailVerification: true
      }
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    
    // Manejar errores específicos
    let statusCode = 400;
    let message = error.message;
    
    if (error.message.includes('email already exists') || 
        error.message.includes('ya está registrado') ||
        error.message.includes('duplicate') ||
        error.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409; // Conflict
      message = 'Este email ya está registrado. ¿Olvidaste tu contraseña?';
    } else if (error.message.includes('validation')) {
      statusCode = 422; // Unprocessable Entity
      message = 'Datos de registro inválidos. Verifica los campos.';
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      statusCode = 503; // Service Unavailable
      message = 'Error de conexión. Inténtalo de nuevo.';
    }
    
    res.status(statusCode).json({
      success: false,
      message: message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/login - Login de usuario
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);
    
    if (result.twoFactorRequired) {
      // Si requiere 2FA, devolver info sin token
      return res.json({
        success: true,
        message: 'Two-factor authentication required',
        data: result
      });
    }

    // Login exitoso con token
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    if (error.message.includes('verifica tu email')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error en login: ' + error.message
    });
  }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // El middleware ya pone la info del usuario en req.user
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuario: ' + error.message
    });
  }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const jwtResponse = await AuthService.refreshToken(token);
    
    res.json(jwtResponse);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/auth/verify-email - Verificar email con token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body; // Token viene en el body del POST
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido'
      });
    }

    await AuthService.verifyEmailToken(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/auth/verify - Verificar cuenta (redirección desde email)
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=missing_token`);
    }

    await AuthService.verifyEmailToken(token);
    
    // Redirigir al frontend con mensaje de éxito
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (error) {
    // Redirigir al frontend con mensaje de error
    res.redirect(`${process.env.FRONTEND_URL}/login?error=verification_failed`);
  }
});

// POST /api/auth/resend-verification - Reenviar email de verificación
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    await AuthService.resendVerificationEmail(email);
    
    res.json({
      success: true,
      message: 'Verification email sent successfully.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Google Authenticator endpoints - equivalente a Spring Boot

// GET /api/auth/google-auth/setup - Configurar Google Authenticator
router.get('/google-auth/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // Generar secreto y QR para Google Authenticator
    const secret = await AuthService.generateGoogleAuthSecret(email);
    const qrCodeUrl = await AuthService.generateGoogleAuthQrUrl(email, secret);

    // Guardar secreto en la base de datos
    await AuthService.saveGoogleAuthSecret(userId, secret);

    res.json({
      success: true,
      message: 'Google Authenticator setup',
      data: {
        qrCodeUrl: qrCodeUrl,
        secret: secret
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generando QR: ' + error.message
    });
  }
});

// POST /api/auth/google-auth/confirm - Confirmar Google Authenticator
router.post('/google-auth/confirm', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Código requerido'
      });
    }

    const valid = await AuthService.verifyGoogleAuthCode(userId, code);
    
    if (valid) {
      await AuthService.enableGoogleAuthForUser(userId);
      res.json({
        success: true,
        message: 'Google Authenticator activado'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Código inválido'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error confirmando Google Authenticator'
    });
  }
});

module.exports = router;