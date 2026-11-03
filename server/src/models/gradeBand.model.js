import { DataTypes } from 'sequelize';

/** One step of a board's grade scale: a percentage at or above `minPercent` earns `grade`. */
export default (sequelize) =>
  sequelize.define(
    'GradeBand',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      board: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'CBSE' },
      grade: { type: DataTypes.STRING(10), allowNull: false },
      minPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: { min: 0, max: 100 },
      },
    },
    // the unique (board, min_percent) index is added by the migration, after the board column exists
    { tableName: 'grade_bands' },
  );
