import { DataTypes } from 'sequelize';

export const ACTIVITY_KINDS = ['event', 'celebration', 'competition', 'sport', 'field_trip', 'club'];
export const ACTIVITY_STATUSES = ['planned', 'open', 'completed', 'cancelled'];

/** One school activity: a one-off event, a celebration, a competition, a sports fixture, a trip, or an ongoing club. */
export default (sequelize) =>
  sequelize.define(
    'Activity',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      kind: { type: DataTypes.ENUM(...ACTIVITY_KINDS), allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: true },
      venue: { type: DataTypes.STRING(160), allowNull: true },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      classId: { type: DataTypes.INTEGER, allowNull: true }, // set when the activity is for one class only
      capacity: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
      fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
      requiresConsent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.ENUM(...ACTIVITY_STATUSES), allowNull: false, defaultValue: 'planned' },
      organizer: { type: DataTypes.STRING(100), allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'activities' },
  );
