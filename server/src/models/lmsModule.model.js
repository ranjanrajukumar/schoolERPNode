import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsModule',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.STRING(1000), allowNull: true },
      sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'lms_modules' },
  );
