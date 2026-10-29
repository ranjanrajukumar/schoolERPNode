import { DataTypes } from 'sequelize';

/** A one-off use of a room in a period of a given date (an exam, a meeting, a practice), outside the weekly timetable. */
export default (sequelize) =>
  sequelize.define(
    'RoomBooking',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      roomId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      period: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 12 } },
      purpose: { type: DataTypes.STRING(160), allowNull: false },
      bookedByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'room_bookings',
      indexes: [{ unique: true, name: 'uq_room_booking', fields: ['room_id', 'date', 'period'] }],
    },
  );
