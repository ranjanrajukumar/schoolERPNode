import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'StaffSalary',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      staffId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      basic: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      allowances: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
      deductions: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
    },
    { tableName: 'staff_salaries' },
  );
