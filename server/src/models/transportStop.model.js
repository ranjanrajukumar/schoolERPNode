import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('TransportStop', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  routeId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  pickupTime: { type: DataTypes.STRING(5), allowNull: true, validate: { is: /^([01]\d|2[0-3]):[0-5]\d$/ } },
}, { tableName: 'transport_stops' });
