import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'TransportRoute',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      vehicleId: { type: DataTypes.INTEGER, allowNull: true },
      monthlyFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
    },
    { tableName: 'transport_routes' },
  );
