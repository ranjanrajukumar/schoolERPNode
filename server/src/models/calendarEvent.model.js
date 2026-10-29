import { DataTypes } from 'sequelize';

export const EVENT_TYPES = ['holiday', 'exam', 'event', 'meeting', 'other'];

export default (sequelize) =>
  sequelize.define(
    'CalendarEvent',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(160), allowNull: false },
      type: { type: DataTypes.ENUM(...EVENT_TYPES), allowNull: false, defaultValue: 'event' },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      audience: { type: DataTypes.ENUM('all', 'staff', 'parents'), allowNull: false, defaultValue: 'all' },
      description: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'calendar_events' },
  );
