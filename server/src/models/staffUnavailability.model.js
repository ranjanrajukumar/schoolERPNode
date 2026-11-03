import { DataTypes } from 'sequelize';

/** A period a teacher cannot teach (part-time days, other duties). The timetable generator and manual entry both respect it. */
export default (sequelize) =>
  sequelize.define(
    'StaffUnavailability',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      staffId: { type: DataTypes.INTEGER, allowNull: false },
      day: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 7 } },
      period: { type: DataTypes.TINYINT, allowNull: false, validate: { min: 1, max: 12 } },
    },
    {
      tableName: 'staff_unavailability',
      indexes: [{ unique: true, name: 'uq_staff_unavail', fields: ['staff_id', 'day', 'period'] }],
    },
  );
