import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('MessageTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  channel: { type: DataTypes.ENUM('email', 'sms'), allowNull: false },
  subject: { type: DataTypes.STRING(200), allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'message_templates' });
