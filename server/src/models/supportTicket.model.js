import { DataTypes } from 'sequelize';

export const TICKET_CATEGORIES = ['question', 'problem', 'suggestion'];
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved'];

/** A request from a staff member to the school's system administrator. */
export default (sequelize) => sequelize.define('SupportTicket', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  subject: { type: DataTypes.STRING(160), allowNull: false },
  category: { type: DataTypes.ENUM(...TICKET_CATEGORIES), allowNull: false, defaultValue: 'question' },
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM(...TICKET_STATUSES), allowNull: false, defaultValue: 'open' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  createdByName: { type: DataTypes.STRING(100), allowNull: false },
  response: { type: DataTypes.TEXT, allowNull: true },
  respondedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'support_tickets', timestamps: true });
