import { DataTypes } from 'sequelize';

/** One saved override per setting. A setting with no row uses its default from the settings registry. */
export default (sequelize) =>
  sequelize.define(
    'Setting',
    {
      key: { type: DataTypes.STRING(60), primaryKey: true },
      value: { type: DataTypes.TEXT, allowNull: false }, // JSON
      updatedByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'settings', timestamps: true, createdAt: false, updatedAt: 'updatedAt' },
  );
