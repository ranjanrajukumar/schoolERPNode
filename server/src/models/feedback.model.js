import { DataTypes } from 'sequelize';

export const FEEDBACK_KINDS = ['feedback', 'grievance'];
export const FEEDBACK_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const FEEDBACK_CATEGORIES = [
  'Academics',
  'Teachers & staff',
  'Fees',
  'Transport',
  'Facilities',
  'Safety',
  'Food & hostel',
  'Other',
];

/**
 * A suggestion, compliment or complaint from a parent, student or staff member, tracked until it is closed.
 * An anonymous one keeps `submittedByUserId` only so the sender can follow its status; the admin never sees who it was.
 */
export default (sequelize) =>
  sequelize.define(
    'Feedback',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      ticketNo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      kind: { type: DataTypes.ENUM(...FEEDBACK_KINDS), allowNull: false },
      category: { type: DataTypes.STRING(40), allowNull: false },
      subject: { type: DataTypes.STRING(150), allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: false },
      rating: { type: DataTypes.INTEGER, allowNull: true }, // 1 to 5, for feedback
      anonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      submittedByUserId: { type: DataTypes.INTEGER, allowNull: false },
      submittedByName: { type: DataTypes.STRING(100), allowNull: false },
      submittedByRole: { type: DataTypes.STRING(10), allowNull: false }, // parent | student | staff
      studentId: { type: DataTypes.INTEGER, allowNull: true }, // the child it is about, from the portal
      status: { type: DataTypes.ENUM(...FEEDBACK_STATUSES), allowNull: false, defaultValue: 'open' },
      priority: { type: DataTypes.ENUM('low', 'normal', 'high'), allowNull: false, defaultValue: 'normal' },
      response: { type: DataTypes.TEXT, allowNull: true },
      respondedByName: { type: DataTypes.STRING(100), allowNull: true },
      respondedOn: { type: DataTypes.DATE, allowNull: true },
      level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 }, // the grievance ladder: 1 class teacher / department head, 2 school office, 3 principal
      lastActionOn: { type: DataTypes.DATE, allowNull: true }, // when someone last handled it; the auto-escalation clock
    },
    {
      tableName: 'feedback',
      indexes: [
        { name: 'ix_feedback_user', fields: ['submitted_by_user_id'] },
        { name: 'ix_feedback_status', fields: ['status'] },
      ],
    },
  );
