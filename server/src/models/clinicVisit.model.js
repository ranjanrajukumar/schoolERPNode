import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('ClinicVisit', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  visitDate: { type: DataTypes.DATEONLY, allowNull: false },
  complaint: { type: DataTypes.STRING(255), allowNull: false },
  treatment: { type: DataTypes.STRING(255), allowNull: true },
  medication: { type: DataTypes.STRING(255), allowNull: true },
  outcome: { type: DataTypes.ENUM('returned_to_class', 'rested', 'sent_home', 'referred'), allowNull: false, defaultValue: 'returned_to_class' },
  parentInformed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'clinic_visits' });
