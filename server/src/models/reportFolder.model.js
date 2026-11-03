import { DataTypes } from 'sequelize';

/** A folder that groups saved report templates (Students, Finance, Board returns…). */
export default (sequelize) =>
  sequelize.define(
    'ReportFolder',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'report_folders' },
  );
