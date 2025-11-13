const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
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
  used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'password_reset_tokens',
  timestamps: false
});

// Método para verificar si el token ha expirado
PasswordResetToken.prototype.isExpired = function() {
  return new Date() > this.expiry_date;
};

// Método para verificar si el token es válido
PasswordResetToken.prototype.isValid = function() {
  return !this.used && !this.isExpired();
};

module.exports = PasswordResetToken;