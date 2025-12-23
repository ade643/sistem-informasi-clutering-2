import { Sequelize } from "sequelize";
import db from "../config/database.js";
import Siswa from "./siswaModel.js";

const { DataTypes } = Sequelize;
const hasil_cluster = db.define(
  "hasil_cluster",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    siswa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Siswa,
        key: "id",
      },
    },
    cluster: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    keterangan: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    semester: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    tahun_ajaran: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    jarak_centroid: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    algoritma: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'kmeans',
    },
    jumlah_cluster: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  { 
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Hubungkan relasi
Siswa.hasMany(hasil_cluster, { foreignKey: "siswa_id", as: "hasil_clusters" });
hasil_cluster.belongsTo(Siswa, { foreignKey: "siswa_id", as: "siswa" });

export default hasil_cluster;