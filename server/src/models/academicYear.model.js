import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('AcademicYear', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'academic_years' });
