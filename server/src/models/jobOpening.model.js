import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('JobOpening', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(120), allowNull: false },
  departmentId: { type: DataTypes.INTEGER, allowNull: true },
  vacancies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  description: { type: DataTypes.STRING(500), allowNull: true },
  closingDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
}, { tableName: 'job_openings' });
