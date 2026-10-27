import { DataTypes } from 'sequelize';

/** One step of the grade scale: a percentage at or above `minPercent` earns `grade`. */
export default (sequelize) => sequelize.define('GradeBand', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  grade: { type: DataTypes.STRING(10), allowNull: false },
  minPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, unique: true, validate: { min: 0, max: 100 } },
}, { tableName: 'grade_bands' });
