import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Payslip',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      staffId: { type: DataTypes.INTEGER, allowNull: false },
      month: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
      basic: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      allowances: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      net: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      status: { type: DataTypes.ENUM('draft', 'paid'), allowNull: false, defaultValue: 'draft' },
      paidOn: { type: DataTypes.DATEONLY, allowNull: true },
      paidByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'payslips',
      indexes: [{ unique: true, name: 'uq_payslip', fields: ['staff_id', 'month'] }],
    },
  );
