import { DataTypes } from 'sequelize';

/** One browser or device that agreed to receive push notifications for a user. */
export default (sequelize) => sequelize.define('PushSubscription', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  endpoint: { type: DataTypes.STRING(500), allowNull: false, unique: true },
  p256dh: { type: DataTypes.STRING(200), allowNull: false },
  auth: { type: DataTypes.STRING(100), allowNull: false },
  userAgent: { type: DataTypes.STRING(200), allowNull: true },
}, { tableName: 'push_subscriptions', timestamps: true, createdAt: 'createdAt', updatedAt: false });
