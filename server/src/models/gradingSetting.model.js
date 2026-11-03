import { DataTypes } from 'sequelize';

/** One row per board holding its pass mark: id 1 is CBSE, id 2 is UP Board. */
export default (sequelize) =>
  sequelize.define(
    'GradingSetting',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      passPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 40,
        validate: { min: 0, max: 100 },
      },
    },
    { tableName: 'grading_settings' },
  );
