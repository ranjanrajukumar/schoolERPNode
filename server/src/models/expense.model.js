import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  category: { type: DataTypes.STRING(80), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  spentOn: { type: DataTypes.DATEONLY, allowNull: false },
  method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank'), allowNull: false, defaultValue: 'cash' },
  reference: { type: DataTypes.STRING(60), allowNull: true },
}, { tableName: 'expenses' });
