import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'StudentTransport',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      routeId: { type: DataTypes.INTEGER, allowNull: false },
      stopId: { type: DataTypes.INTEGER, allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      tripType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'both' },
      authorizedPickupName: { type: DataTypes.STRING(100), allowNull: true },
      authorizedPickupPhone: { type: DataTypes.STRING(20), allowNull: true },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'student_transport' },
  );
