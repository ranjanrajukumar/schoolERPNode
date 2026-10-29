import { DataTypes } from 'sequelize';

// The master list of course tags. Courses pick from it; they do not invent their own.
export default (sequelize) =>
  sequelize.define(
    'LmsTag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    },
    { tableName: 'lms_tags' },
  );
