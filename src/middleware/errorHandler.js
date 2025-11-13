// Middleware de manejo de errores global
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors
    });
  }

  // Error de clave única de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Ya existe un registro con esos datos',
      field: err.errors[0]?.path
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Error de base de datos
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Error de base de datos'
    });
  }

  // Error personalizado con status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message || 'Error del servidor'
    });
  }

  // Error genérico del servidor
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;