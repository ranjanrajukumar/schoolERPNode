import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'FeeGroupItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(120), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'fee_group_items' },
  );
