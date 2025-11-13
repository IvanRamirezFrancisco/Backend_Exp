const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VerificationToken = sequelize.define('VerificationToken', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
  },
  token_type: {
    type: DataTypes.ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET'),
    allowNull: true,
    defaultValue: 'EMAIL_VERIFICATION'
  },
  used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'verification_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // No hay updated_at en verification_tokens según tu esquema
});

// Método para verificar si el token ha expirado
VerificationToken.prototype.isExpired = function() {
  return new Date() > this.expiry_date;
};

// Método para verificar si el token es válido
VerificationToken.prototype.isValid = function() {
  return !this.used && !this.isExpired();
};

module.exports = VerificationToken;