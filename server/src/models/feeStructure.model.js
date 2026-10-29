import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'FeeStructure',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(120), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'fee_structures' },
  );
