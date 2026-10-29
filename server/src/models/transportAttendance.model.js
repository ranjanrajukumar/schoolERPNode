import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'TransportAttendance',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      trip: { type: DataTypes.ENUM('morning', 'evening'), allowNull: false },
      status: { type: DataTypes.ENUM('boarded', 'absent'), allowNull: false },
    },
    {
      tableName: 'transport_attendance',
      indexes: [{ unique: true, name: 'uq_transport_att', fields: ['student_id', 'date', 'trip'] }],
    },
  );
