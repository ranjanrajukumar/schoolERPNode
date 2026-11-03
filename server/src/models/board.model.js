import { DataTypes } from 'sequelize';

/**
 * A board the software can run (CBSE, UP Board). This is software capability only: it says nothing about whether the
 * school is affiliated to or recognised by the board. That is recorded separately in BoardAffiliation.
 */
export default (sequelize) =>
  sequelize.define(
    'Board',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'boards' },
  );
