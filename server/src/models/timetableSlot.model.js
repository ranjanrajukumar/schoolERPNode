import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('TimetableSlot', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  classId: { type: DataTypes.INTEGER, allowNull: false },
  day: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 7 } }, // 1 = Monday
  period: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 12 } },
  subjectId: { type: DataTypes.INTEGER, allowNull: false },
  staffId: { type: DataTypes.INTEGER, allowNull: true },
  roomId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'timetable_slots',
  indexes: [{ unique: true, name: 'uq_slot', fields: ['class_id', 'day', 'period'] }],
});
