import { DataTypes } from 'sequelize';

/**
 * One generation of a saved report: who asked for it, when, in what format, how it went, and where the finished file is kept for a
 * short while. The row stays as the history and log after the file has been cleaned up.
 */
export default (sequelize) =>
  sequelize.define(
    'ReportRun',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      templateId: { type: DataTypes.INTEGER, allowNull: true },
      templateName: { type: DataTypes.STRING(120), allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      userName: { type: DataTypes.STRING(100), allowNull: true },
      role: { type: DataTypes.STRING(60), allowNull: true },
      format: { type: DataTypes.ENUM('pdf', 'xlsx'), allowNull: false },
      status: {
        type: DataTypes.ENUM('queued', 'running', 'done', 'failed', 'expired'),
        allowNull: false,
        defaultValue: 'queued',
      },
      rowCount: { type: DataTypes.INTEGER, allowNull: true },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: true },
      fileName: { type: DataTypes.STRING(160), allowNull: true }, // the name the person downloads it as
      storedName: { type: DataTypes.STRING(64), allowNull: true }, // the random name on disk; never shown or guessable
      error: { type: DataTypes.STRING(300), allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      finishedAt: { type: DataTypes.DATE, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'report_runs',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: false,
      indexes: [
        { name: 'idx_report_run_user', fields: ['user_id', 'created_at'] },
        { name: 'idx_report_run_status', fields: ['status'] },
      ],
    },
  );
