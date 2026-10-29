import { DataTypes } from 'sequelize';

/** The GPS unit on a bus. It authenticates with `apiKey` when it posts its position. */
export default (sequelize) =>
  sequelize.define(
    'VehicleTracker',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vehicleId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      apiKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    },
    { tableName: 'vehicle_trackers' },
  );
