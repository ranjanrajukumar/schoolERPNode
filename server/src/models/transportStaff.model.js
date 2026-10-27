import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('TransportStaff', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  role: { type: DataTypes.ENUM('driver', 'attendant'), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  licenseNo: { type: DataTypes.STRING(40), allowNull: true },
  licenseExpiry: { type: DataTypes.DATEONLY, allowNull: true },
  vehicleId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'transport_staff' });
