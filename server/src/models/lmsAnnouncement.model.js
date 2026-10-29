import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LmsAnnouncement',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      courseId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'lms_announcements', timestamps: true, createdAt: 'createdAt', updatedAt: 'updatedAt' },
  );
