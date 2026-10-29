import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Supplier',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      contactPerson: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'suppliers' },
  );
