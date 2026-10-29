import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Hostel',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      type: { type: DataTypes.ENUM('boys', 'girls', 'mixed'), allowNull: false, defaultValue: 'boys' },
      wardenName: { type: DataTypes.STRING(100), allowNull: true },
      wardenPhone: { type: DataTypes.STRING(30), allowNull: true },
      address: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'hostels' },
  );
