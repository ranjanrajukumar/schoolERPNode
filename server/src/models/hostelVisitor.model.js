import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'HostelVisitor',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      visitorName: { type: DataTypes.STRING(100), allowNull: false },
      relation: { type: DataTypes.STRING(50), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      purpose: { type: DataTypes.STRING(200), allowNull: true },
      checkIn: { type: DataTypes.DATE, allowNull: false },
      checkOut: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'hostel_visitors' },
  );
