const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [1, 100]
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  two_factor_type: {
    type: DataTypes.ENUM('GOOGLE_AUTHENTICATOR', 'EMAIL', 'SMS'),
    allowNull: true
  },
  account_non_expired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  account_non_locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  credentials_non_expired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  google_auth_secret: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  google_auth_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sms_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  email_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  sync: false, // No sincronizar automáticamente
  hooks: {
    beforeCreate: (user) => {
      // Asegurarse de que los valores por defecto estén establecidos
      if (user.enabled === undefined) user.enabled = false;
      if (user.two_factor_enabled === undefined) user.two_factor_enabled = false;
      if (user.google_auth_enabled === undefined) user.google_auth_enabled = false;
      if (user.sms_enabled === undefined) user.sms_enabled = false;
      if (user.email_enabled === undefined) user.email_enabled = false;
    }
  }
});

// Métodos de instancia
User.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password; // No devolver la contraseña en JSON
  return values;
};

module.exports = User;