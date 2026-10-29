import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      feeId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank'), allowNull: false, defaultValue: 'cash' },
      receiptNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      paidOn: { type: DataTypes.DATEONLY, allowNull: false },
      receivedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'payments' },
  );
