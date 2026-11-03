import { DataTypes } from 'sequelize';

/**
 * The school's (or one branch's) legal standing with a board. 'unverified' until someone records the evidence;
 * nothing printed for parents may claim affiliation unless this is 'verified' and still in date.
 */
export default (sequelize) =>
  sequelize.define(
    'BoardAffiliation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      boardId: { type: DataTypes.INTEGER, allowNull: false },
      branchId: { type: DataTypes.INTEGER, allowNull: true }, // null = the whole school
      status: {
        type: DataTypes.ENUM('unverified', 'verified', 'lapsed'),
        allowNull: false,
        defaultValue: 'unverified',
      },
      affiliationNo: { type: DataTypes.STRING(60), allowNull: true },
      validFrom: { type: DataTypes.DATEONLY, allowNull: true },
      validTo: { type: DataTypes.DATEONLY, allowNull: true },
      sourceRef: { type: DataTypes.STRING(255), allowNull: true }, // the certificate or portal record that proves it
      verifiedBy: { type: DataTypes.STRING(100), allowNull: true },
      verifiedOn: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'board_affiliations' },
  );
