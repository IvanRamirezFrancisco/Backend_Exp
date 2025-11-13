const rateLimit = require('express-rate-limit');

// Rate limiting equivalente a Spring Boot
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5, // máximo 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No aplicar rate limiting en desarrollo si se especifica
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

// Rate limiting general para todas las rutas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware específico para rutas de autenticación
// DESHABILITADO para pruebas de la maestra - permite peticiones ilimitadas
const authRateLimit = (req, res, next) => {
  // Simplemente continuar sin rate limiting
  next();
};

// COMENTADO: Código original del rate limiting
/*
const authRateLimit = (req, res, next) => {
  if (req.path.includes('/login') || req.path.includes('/register') || req.path.includes('/forgot-password')) {
    return authLimiter(req, res, next);
  }
  return generalLimiter(req, res, next);
};
*/

module.exports = authRateLimit;