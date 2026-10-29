import { DataTypes } from 'sequelize';

/** One topic of a subject's syllabus for a class; the same row is the lesson plan (planned date) and the tracker (status). */
export default (sequelize) =>
  sequelize.define(
    'SyllabusTopic',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      classId: { type: DataTypes.INTEGER, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      title: { type: DataTypes.STRING(200), allowNull: false },
      objective: { type: DataTypes.STRING(500), allowNull: true },
      plannedDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'not_started',
      },
      completedOn: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'syllabus_topics' },
  );
