import { DataTypes } from 'sequelize';

/** A co-scholastic area graded on the progress card: art, sports, discipline, life skills. */
export default (sequelize) => sequelize.define('CoScholasticArea', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  category: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'Skills' },
}, { tableName: 'co_scholastic_areas' });
