import { DataTypes } from 'sequelize';

/** One raw punch from a device. `enrollId` is the user id stored on the device (the student's admission number). */
export default (sequelize) => sequelize.define('BiometricPunch', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  enrollId: { type: DataTypes.STRING(40), allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: true }, // null when no student has this enrollId
  punchedAt: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'biometric_punches',
  indexes: [
    { unique: true, name: 'uq_punch', fields: ['device_id', 'enroll_id', 'punched_at'] }, // a device that resends a punch changes nothing
    { name: 'ix_punch_time', fields: ['punched_at'] },
  ],
});
