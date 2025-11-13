const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TwoFactorToken = sequelize.define('TwoFactorToken', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'token'
  },
  token_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'token_type'
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
  },
  used: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'used_at'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'two_factor_tokens',
  timestamps: false
});

// Método para verificar si el token ha expirado
TwoFactorToken.prototype.isExpired = function() {
  return new Date() > this.expiry_date;
};

// Método para verificar si el token es válido
TwoFactorToken.prototype.isValid = function() {
  return !this.used && !this.isExpired();
};

module.exports = TwoFactorToken;