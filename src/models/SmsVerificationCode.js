const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmsVerificationCode = sequelize.define('SmsVerificationCode', {
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
  code: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
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
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'sms_verification_codes',
  timestamps: false
});

// Método para verificar si el código ha expirado
SmsVerificationCode.prototype.isExpired = function() {
  return new Date() > this.expiry_date;
};

// Método para verificar si el código es válido
SmsVerificationCode.prototype.isValid = function() {
  return !this.used && !this.isExpired() && this.attempts < 3;
};

module.exports = SmsVerificationCode;