import { DataTypes } from 'sequelize';

/**
 * One email or SMS the system tried to send. "logged" means no provider is configured, so the
 * message was recorded but NOT delivered.
 */
export default (sequelize) => sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  channel: { type: DataTypes.ENUM('email', 'sms'), allowNull: false },
  kind: { type: DataTypes.ENUM('direct', 'broadcast', 'absence', 'fee_reminder'), allowNull: false, defaultValue: 'direct' },
  recipient: { type: DataTypes.STRING(150), allowNull: false },
  recipientName: { type: DataTypes.STRING(120), allowNull: true },
  studentId: { type: DataTypes.INTEGER, allowNull: true },
  subject: { type: DataTypes.STRING(200), allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('sent', 'logged', 'failed'), allowNull: false },
  provider: { type: DataTypes.STRING(30), allowNull: false },
  error: { type: DataTypes.STRING(300), allowNull: true },
  sentByName: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [{ name: 'ix_messages_kind_student', fields: ['kind', 'student_id', 'created_at'] }],
});
