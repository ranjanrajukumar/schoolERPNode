import { DataTypes } from 'sequelize';

const ASSET_STATUSES = ['in_use', 'in_store', 'under_repair', 'disposed'];

/** A tracked, individually tagged item (computer, projector, furniture), unlike stock items which are counted. */
export default (sequelize) =>
  sequelize.define(
    'Asset',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assetTag: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },
      location: { type: DataTypes.STRING(120), allowNull: true },
      purchaseDate: { type: DataTypes.DATEONLY, allowNull: true },
      cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
      status: { type: DataTypes.ENUM(...ASSET_STATUSES), allowNull: false, defaultValue: 'in_use' },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'assets' },
  );
