import { DataTypes } from 'sequelize';

/** A single row (id 1) holding school-wide grading policy. */
export default (sequelize) => sequelize.define('GradingSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  passPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 40, validate: { min: 0, max: 100 } },
}, { tableName: 'grading_settings' });
