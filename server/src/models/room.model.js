import { DataTypes } from 'sequelize';

const ROOM_KINDS = ['classroom', 'lab', 'hall', 'library', 'ground', 'other'];

/** A place that can host a period: a classroom, lab, hall or the playground. */
export default (sequelize) =>
  sequelize.define(
    'Room',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      kind: { type: DataTypes.ENUM(...ROOM_KINDS), allowNull: false, defaultValue: 'classroom' },
      capacity: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    },
    { tableName: 'rooms' },
  );
