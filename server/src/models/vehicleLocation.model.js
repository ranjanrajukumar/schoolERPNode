import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'VehicleLocation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vehicleId: { type: DataTypes.INTEGER, allowNull: false },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
      speed: { type: DataTypes.DECIMAL(5, 1), allowNull: true }, // km/h
      recordedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'vehicle_locations', indexes: [{ name: 'ix_vloc', fields: ['vehicle_id', 'recorded_at'] }] },
  );
