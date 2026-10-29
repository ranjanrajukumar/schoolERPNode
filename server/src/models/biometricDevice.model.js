import { DataTypes } from 'sequelize';

/** A fingerprint / face / card reader at a gate or classroom door. It authenticates with `apiKey` when it posts punches. */
export default (sequelize) =>
  sequelize.define(
    'BiometricDevice',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      serialNo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      location: { type: DataTypes.STRING(120), allowNull: true },
      apiKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      lastSeenAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'biometric_devices' },
  );
