import { DataTypes } from 'sequelize';

/** One sign-in attempt. Passwords are never stored; `userId` is empty when the email matched no account. */
export default (sequelize) => sequelize.define('LoginEvent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: true },
  success: { type: DataTypes.BOOLEAN, allowNull: false },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(200), allowNull: true },
}, {
  tableName: 'login_events',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [{ name: 'ix_login_events_created', fields: ['created_at'] }, { name: 'ix_login_events_user', fields: ['user_id', 'created_at'] }],
});
