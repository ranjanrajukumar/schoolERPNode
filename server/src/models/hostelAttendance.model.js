import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'HostelAttendance',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.ENUM('present', 'absent', 'leave'), allowNull: false },
    },
    {
      tableName: 'hostel_attendance',
      indexes: [{ unique: true, name: 'uq_hostel_att', fields: ['student_id', 'date'] }],
    },
  );
