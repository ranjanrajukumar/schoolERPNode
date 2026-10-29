import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'SchoolClass',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      branchId: { type: DataTypes.INTEGER, allowNull: true },
      classTeacherId: { type: DataTypes.INTEGER, allowNull: true },
      room: { type: DataTypes.STRING(20), allowNull: true },
      section: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'A' },
    },
    {
      tableName: 'classes',
      indexes: [{ unique: true, name: 'uq_class', fields: ['name', 'section'] }],
    },
  );
