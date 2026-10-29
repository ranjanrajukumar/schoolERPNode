import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'StudentLeave',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      leaveTypeId: { type: DataTypes.INTEGER, allowNull: true },
      fromDate: { type: DataTypes.DATEONLY, allowNull: false },
      toDate: { type: DataTypes.DATEONLY, allowNull: false },
      days: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        get() {
          return Number(this.getDataValue('days'));
        },
      }, // 0.5 for a half day, 0 for a timely (a few hours) leave
      dayPart: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'full' }, // full | first_half | second_half | time
      fromTime: { type: DataTypes.STRING(5), allowNull: true }, // HH:MM, for a timely leave
      toTime: { type: DataTypes.STRING(5), allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
      requestedBy: { type: DataTypes.INTEGER, allowNull: true },
      decidedBy: { type: DataTypes.INTEGER, allowNull: true },
      requestedByRole: { type: DataTypes.STRING(10), allowNull: true }, // student | parent | staff
      decidedByName: { type: DataTypes.STRING(100), allowNull: true },
      decidedOn: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'student_leaves', timestamps: true, createdAt: 'createdAt', updatedAt: false },
  );
