import { DataTypes } from 'sequelize';

/** A record that the school told a guardian about an absence. (No SMS gateway: staff log the call/message they made.) */
export default (sequelize) => sequelize.define('AbsenceAlert', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  method: { type: DataTypes.ENUM('call', 'sms', 'whatsapp', 'in_person', 'portal'), allowNull: false },
  note: { type: DataTypes.STRING(255), allowNull: true },
  notifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  notifiedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'absence_alerts', timestamps: true, createdAt: 'createdAt', updatedAt: false });
