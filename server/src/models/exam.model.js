import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Exam', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  maxMarks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100, validate: { min: 1 } },
  examGroupId: { type: DataTypes.INTEGER, allowNull: true },
  // Share of the group result this exam carries (only relative to the other exams in the group).
  weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100, validate: { min: 1, max: 1000 } },
}, { tableName: 'exams' });
