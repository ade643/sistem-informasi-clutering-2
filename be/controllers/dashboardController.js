import Siswa from '../model/siswaModel.js';
import Nilai from '../model/nilaiModel.js';
import hasil_cluster from '../model/hasil.js';
import User from '../model/userModel.js';
import db from '../config/database.js';
import { Op } from 'sequelize';

// Helper function to calculate student averages
const getStudentAverages = async (whereClause = {}) => {
  return await Nilai.findAll({
    where: whereClause,
    attributes: [
        'siswa_id',
        [db.fn('AVG', db.col('nilai')), 'rata_rata']
    ],
    group: ['siswa_id']
  });
};

export const getDashboardStats = async (req, res) => {
  try {
    const { semester, tahun_ajaran } = req.query;

    let activeFilter = {};
    let activeSemester = semester || null;
    let activeTahunAjaran = tahun_ajaran || null;

    // If no filters are provided, find the latest clustering run and use its period as the default
    if (!activeSemester && !activeTahunAjaran) {
      const latestResult = await hasil_cluster.findOne({
        order: [['created_at', 'DESC']]
      });
      if (latestResult) {
        activeSemester = latestResult.semester;
        activeTahunAjaran = latestResult.tahun_ajaran;
      }
    }

    if (activeSemester) activeFilter.semester = activeSemester;
    if (activeTahunAjaran) activeFilter.tahun_ajaran = activeTahunAjaran;

    // Get basic counts. Total Siswa and Users are global.
    const totalSiswa = await Siswa.count();
    const totalUsers = await User.count();
    
    // Counts for the active period
    const totalClustering = await hasil_cluster.count({ where: activeFilter });
    const totalNilai = await Nilai.count({ where: activeFilter });

    // Averages for the active period
    const avgResult = await Nilai.findOne({
      where: activeFilter,
      attributes: [[db.fn('AVG', db.col('nilai')), 'rata_rata_keseluruhan']]
    });
    const avgNilai = parseFloat(avgResult?.dataValues?.rata_rata_keseluruhan || 0);

    // High and low performers for the active period
    const studentAverages = await getStudentAverages(activeFilter);
    const siswaBerprestasi = studentAverages.filter(s => s.dataValues.rata_rata >= 80).length;
    const perluPerhatian = studentAverages.filter(s => s.dataValues.rata_rata < 60).length;

    // Cluster distribution for the active period
    const clusterStats = await hasil_cluster.findAll({
      where: activeFilter,
      attributes: [
        'keterangan',
        [db.fn('COUNT', '*'), 'jumlah']
      ],
      group: ['keterangan']
    });

    const clusterDistribution = {
      tinggi: { count: 0, percentage: '0.0' },
      sedang: { count: 0, percentage: '0.0' },
      rendah: { count: 0, percentage: '0.0' }
    };

    if (clusterStats && totalClustering > 0) {
      clusterStats.forEach(stat => {
        const label = stat.dataValues.keterangan.toLowerCase();
        if (clusterDistribution[label]) {
          const count = parseInt(stat.dataValues.jumlah);
          clusterDistribution[label] = {
            count: count,
            percentage: ((count / totalClustering) * 100).toFixed(1)
          };
        }
      });
    }

    res.json({
      success: true,
      data: {
        active_period: { semester: activeSemester, tahun_ajaran: activeTahunAjaran },
        stats: {
          total_siswa: totalSiswa || 0,
          total_nilai: totalNilai || 0,
          total_users: totalUsers || 0,
          total_clustering: totalClustering || 0,
          rata_rata_nilai: isNaN(avgNilai) ? "0.0" : avgNilai.toFixed(1),
          siswa_berprestasi: siswaBerprestasi || 0,
          perlu_perhatian: perluPerhatian || 0
        },
        changes: { siswa: "+0", nilai: "+0", clustering: "0", users: "+0" },
        cluster_distribution: clusterDistribution,
        recent_activities: []
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memuat data dashboard' });
  }
};

export const getChartData = async (req, res) => {
  try {
    const studentAverages = await getStudentAverages();

    // Nilai distribution by range
    const nilaiDistribution = {
      '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0
    };
    studentAverages.forEach(s => {
      const avg = s.dataValues.rata_rata;
      if (avg <= 59) nilaiDistribution['0-59']++;
      else if (avg <= 69) nilaiDistribution['60-69']++;
      else if (avg <= 79) nilaiDistribution['70-79']++;
      else if (avg <= 89) nilaiDistribution['80-89']++;
      else nilaiDistribution['90-100']++;
    });
    const nilaiDistributionChart = Object.entries(nilaiDistribution).map(([range, count]) => ({ range, count }));

    // Get nilai by kelas
    const nilaiByKelasResult = await Nilai.findAll({
      include: [{ model: Siswa, as: 'siswa', attributes: ['kelas'] }],
      attributes: [
        'siswa.kelas',
        [db.fn('AVG', db.col('nilai')), 'rata_rata']
      ],
      group: ['siswa.kelas']
    });
    const nilaiByKelas = nilaiByKelasResult.map(item => ({ 
        kelas: item.siswa.kelas,
        rata_rata: parseFloat(item.dataValues.rata_rata).toFixed(2)
    }));

    // Get siswa by gender
    const siswaByGender = await Siswa.findAll({
      attributes: ['jenis_kelamin', [db.fn('COUNT', db.col('id')), 'jumlah']],
      group: ['jenis_kelamin']
    });

    res.json({
      success: true,
      data: {
        nilai_distribution: nilaiDistributionChart,
        nilai_by_kelas: nilaiByKelas,
        siswa_by_gender: siswaByGender,
      }
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memuat data chart' });
  }
};

export const getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const siswaHariIni = await Siswa.count({ where: { created_at: { [Op.gte]: today } } });
    const nilaiHariIni = await Nilai.count({ where: { created_at: { [Op.gte]: today } } });
    const clusteringHariIni = await hasil_cluster.count({ where: { created_at: { [Op.gte]: today } } });

    // Get top performing students
    const studentAverages = await getStudentAverages();
    const topStudentsData = studentAverages.sort((a, b) => b.dataValues.rata_rata - a.dataValues.rata_rata).slice(0, 5);
    const topStudentsSiswaIds = topStudentsData.map(s => s.siswa_id);
    
    const topStudents = await Siswa.findAll({ where: { id: { [Op.in]: topStudentsSiswaIds } } });
    const topStudentsResult = topStudents.map(siswa => {
        const avg = topStudentsData.find(s => s.siswa_id === siswa.id)?.dataValues.rata_rata;
        return { ...siswa.get({ plain: true }), rata_rata: parseFloat(avg).toFixed(2) };
    });

    res.json({
      success: true,
      data: {
        today_stats: {
          siswa_baru: siswaHariIni,
          nilai_baru: nilaiHariIni,
          clustering_baru: clusteringHariIni
        },
        top_students: topStudentsResult,
      }
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat memuat quick stats' });
  }
};

export const getDashboardFilters = async (req, res) => {
  try {
    const tahunAjaran = await hasil_cluster.findAll({
      attributes: [[db.fn('DISTINCT', db.col('tahun_ajaran')), 'tahun_ajaran']],
      order: [['tahun_ajaran', 'DESC']],
    });
    const semester = await hasil_cluster.findAll({
      attributes: [[db.fn('DISTINCT', db.col('semester')), 'semester']],
      order: [['semester', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        tahun_ajaran: tahunAjaran.map(item => item.tahun_ajaran).filter(Boolean),
        semester: semester.map(item => item.semester).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Get dashboard filters error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};