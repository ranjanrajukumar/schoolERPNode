import { DataTypes } from 'sequelize';

export const RULE_TYPES = [
  'subject_template',
  'exam_pattern',
  'grading',
  'bell_schedule',
  'promotion',
  'report_card',
];

/**
 * One version of an academic rule of a board. Versions are never edited: a change adds the next version and retires
 * the one it replaces, so the rules in force in any past session can be shown. `effectiveYearId` is the first
 * academic session the version applies from (null = from the beginning).
 * `verified` is true only when someone has checked the rule against the board's own publication, named in `sourceRef`.
 */
export default (sequelize) =>
  sequelize.define(
    'BoardRule',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      boardId: { type: DataTypes.INTEGER, allowNull: false },
      ruleType: { type: DataTypes.ENUM(...RULE_TYPES), allowNull: false },
      scopeKey: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'default' }, // e.g. the class stage of a subject template
      effectiveYearId: { type: DataTypes.INTEGER, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: { type: DataTypes.ENUM('active', 'retired'), allowNull: false, defaultValue: 'active' },
      payload: { type: DataTypes.TEXT('long'), allowNull: false },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sourceRef: { type: DataTypes.STRING(500), allowNull: true },
      changeNote: { type: DataTypes.STRING(500), allowNull: true },
      createdByName: { type: DataTypes.STRING(100), allowNull: true },
      verifiedBy: { type: DataTypes.STRING(100), allowNull: true },
      verifiedOn: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      tableName: 'board_rules',
      indexes: [
        {
          unique: true,
          name: 'uq_board_rule_version',
          fields: ['board_id', 'rule_type', 'scope_key', 'effective_year_id', 'version'],
        },
      ],
    },
  );
