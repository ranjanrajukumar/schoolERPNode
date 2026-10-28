import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('LmsAssignment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  courseId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  instructions: { type: DataTypes.TEXT, allowNull: true },
  dueOn: { type: DataTypes.DATEONLY, allowNull: true },
  maxScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100, validate: { min: 1, max: 10000 } },
  published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'lms_assignments' });
