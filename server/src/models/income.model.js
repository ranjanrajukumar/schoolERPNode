import { DataTypes } from 'sequelize';

/** Money received other than student fees (donations, rent, events...). Fee payments live in payments. */
export default (sequelize) => sequelize.define('Income', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  source: { type: DataTypes.STRING(80), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  receivedOn: { type: DataTypes.DATEONLY, allowNull: false },
  method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank'), allowNull: false, defaultValue: 'cash' },
  reference: { type: DataTypes.STRING(60), allowNull: true },
}, { tableName: 'incomes' });
