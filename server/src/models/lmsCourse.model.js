import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('LmsCourse', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  subjectId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  description: { type: DataTypes.STRING(1000), allowNull: true },
  published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  createdByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'lms_courses', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' });
