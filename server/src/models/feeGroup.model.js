import { DataTypes } from 'sequelize';

/** A reusable bundle of fee items (e.g. "Boarding pack") that can be applied to a class in one step. */
export default (sequelize) =>
  sequelize.define(
    'FeeGroup',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'fee_groups' },
  );
