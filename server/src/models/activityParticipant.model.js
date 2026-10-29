import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'ActivityParticipant',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      activityId: { type: DataTypes.INTEGER, allowNull: false },
      studentId: { type: DataTypes.INTEGER, allowNull: false },
      // registered -> attended | absent. (Removing a participant deletes the row.)
      status: {
        type: DataTypes.ENUM('registered', 'attended', 'absent'),
        allowNull: false,
        defaultValue: 'registered',
      },
      consent: {
        type: DataTypes.ENUM('not_required', 'pending', 'given', 'declined'),
        allowNull: false,
        defaultValue: 'not_required',
      },
      result: { type: DataTypes.STRING(80), allowNull: true }, // e.g. "1st place", "Participation"
      remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'activity_participants',
      indexes: [{ unique: true, name: 'uq_activity_student', fields: ['activity_id', 'student_id'] }],
    },
  );
