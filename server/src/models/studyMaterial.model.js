import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('StudyMaterial', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  subjectId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false, validate: { is: /^https?:\/\/\S+$/i } },
  description: { type: DataTypes.STRING(500), allowNull: true },
  createdByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'study_materials', timestamps: true, createdAt: 'createdAt', updatedAt: false });
