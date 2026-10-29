import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Refund',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      paymentId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
      reason: { type: DataTypes.STRING(160), allowNull: false },
      refundedOn: { type: DataTypes.DATEONLY, allowNull: false },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'refunds' },
  );
