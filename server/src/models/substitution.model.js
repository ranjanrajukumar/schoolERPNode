import { DataTypes } from 'sequelize';

/** Cover for one timetable period on one date: `substituteId` teaches `slotId` instead of the usual teacher. */
export default (sequelize) => sequelize.define('Substitution', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  slotId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  substituteId: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.STRING(160), allowNull: true },
  createdByName: { type: DataTypes.STRING(100), allowNull: true },
}, {
  tableName: 'substitutions',
  indexes: [{ unique: true, name: 'uq_substitution', fields: ['slot_id', 'date'] }],
});
