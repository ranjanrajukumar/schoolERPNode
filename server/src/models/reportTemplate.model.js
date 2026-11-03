import { DataTypes } from 'sequelize';

/**
 * A saved report design: a dataset with the columns, filters, sort and date range to run on it, the title to print, the folder it
 * lives in, and the roles allowed to run it. Admins design and edit; the roles named here can only run and export it.
 * `config` is JSON: { dataset, columns, filters, sortBy, sortDir, dateColumn, dateFrom, dateTo, title }.
 */
export default (sequelize) =>
  sequelize.define(
    'ReportTemplate',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      folderId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      config: { type: DataTypes.TEXT, allowNull: false },
      roles: { type: DataTypes.STRING(255), allowNull: true }, // comma-separated role names that may run it; the built-in admin always can
      pages: { type: DataTypes.STRING(255), allowNull: true }, // comma-separated keys of the screens that list this report (see reportPages.js)
      board: { type: DataTypes.STRING(20), allowNull: true }, // CBSE or UP Board: the report then sees only that board's classes
      createdByName: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'report_templates',
      indexes: [{ unique: true, name: 'uq_report_template', fields: ['folder_id', 'name'] }],
    },
  );
