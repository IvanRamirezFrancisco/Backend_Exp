const { sequelize } = require('../config/database');

// Importar todos los modelos
const User = require('./User');
const Role = require('./Role');
const PasswordResetToken = require('./PasswordResetToken');
const VerificationToken = require('./VerificationToken');
const TwoFactorToken = require('./TwoFactorToken');
const SmsVerificationCode = require('./SmsVerificationCode');

// Definir relaciones - equivalente a las anotaciones JPA
// Relación Many-to-Many entre User y Role
const UserRole = sequelize.define('UserRole', {}, {
  tableName: 'user_roles',
  timestamps: false
});

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles'
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users'
});

// Relaciones One-to-Many
User.hasMany(PasswordResetToken, {
  foreignKey: 'user_id',
  as: 'passwordResetTokens'
});
PasswordResetToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(VerificationToken, {
  foreignKey: 'user_id',
  as: 'verificationTokens'
});
VerificationToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(TwoFactorToken, {
  foreignKey: 'user_id',
  as: 'twoFactorTokens'
});
TwoFactorToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(SmsVerificationCode, {
  foreignKey: 'user_id',
  as: 'smsVerificationCodes'
});
SmsVerificationCode.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Exportar todos los modelos
const models = {
  User,
  Role,
  UserRole,
  PasswordResetToken,
  VerificationToken,
  TwoFactorToken,
  SmsVerificationCode,
  sequelize
};

module.exports = models;