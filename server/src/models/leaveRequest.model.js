import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'LeaveRequest',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      staffId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING(60), allowNull: false }, // the leave type's name when it was applied for
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
      reason: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      remarks: { type: DataTypes.STRING(255), allowNull: true },
      decidedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'leave_requests', timestamps: true, createdAt: 'createdAt', updatedAt: false },
  );
