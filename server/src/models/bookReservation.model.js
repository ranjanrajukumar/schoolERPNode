import { DataTypes } from 'sequelize';

/** A student's place in the queue for a book whose copies are all out. The oldest active reservation is served first. */
export default (sequelize) =>
  sequelize.define(
    'BookReservation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bookId: { type: DataTypes.INTEGER, allowNull: false },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      reservedOn: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('active', 'fulfilled', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    { tableName: 'book_reservations' },
  );
