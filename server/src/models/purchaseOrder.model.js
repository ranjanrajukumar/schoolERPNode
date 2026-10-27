import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplierId: { type: DataTypes.INTEGER, allowNull: false },
  orderDate: { type: DataTypes.DATEONLY, allowNull: false },
  expectedDate: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.ENUM('ordered', 'received', 'cancelled'), allowNull: false, defaultValue: 'ordered' },
  receivedOn: { type: DataTypes.DATEONLY, allowNull: true },
  note: { type: DataTypes.STRING(255), allowNull: true },
  createdByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'purchase_orders' });
