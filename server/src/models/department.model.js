import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'Department',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      headStaffId: { type: DataTypes.INTEGER, allowNull: true }, // the department head, who can approve leave of their department's staff
    },
    { tableName: 'departments' },
  );
