import { DataTypes } from 'sequelize';

/** One step in the life of a feedback / grievance: submitted, replied, escalated, resolved. Shown as its timeline. */
export default (sequelize) => sequelize.define('FeedbackLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  feedbackId: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING(30), allowNull: false }, // submitted | replied | status | escalated | auto_escalated
  level: { type: DataTypes.INTEGER, allowNull: false }, // the level it was at after this step
  note: { type: DataTypes.STRING(500), allowNull: true },
  byName: { type: DataTypes.STRING(100), allowNull: true }, // null for the system
}, { tableName: 'feedback_logs', indexes: [{ name: 'ix_fblog_feedback', fields: ['feedback_id'] }] });
