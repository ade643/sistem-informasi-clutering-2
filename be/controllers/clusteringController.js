import { Sequelize } from 'sequelize';
import hasil_cluster from '../model/hasil.js';
import Nilai from '../model/nilaiModel.js'; // Ganti dengan model baru
import Siswa from '../model/siswaModel.js';
import MataPelajaran from '../model/mapelModel.js'; // Ganti dengan model baru
import axios from 'axios';
import PDFDocument from 'pdfkit';

export const runClustering = async (req, res) => {
  try {
    // --- 1. Validasi Input ---
    let { algoritma = 'kmeans', jumlah_cluster = 3, semester = '', tahun_ajaran = '' } = req.body;
    jumlah_cluster = parseInt(jumlah_cluster);

    if (isNaN(jumlah_cluster) || jumlah_cluster <= 0) {
      return res.status(400).json({ message: 'Jumlah cluster harus berupa angka positif' });
    }
    if (jumlah_cluster > 5) {
      return res.status(400).json({ message: 'Jumlah cluster maksimal 5' });
  }

    // --- 2. Persiapan Data ---
    const allMapel = await MataPelajaran.findAll({ order: [['id', 'ASC']] });
    const mapelOrder = allMapel.map(m => m.id);

    const whereClause = {};
    if (semester) whereClause.semester = semester;
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;

    const nilaiData = await Nilai.findAll({
      where: whereClause,
      include: [
        { model: Siswa, as: 'siswa', attributes: ['id', 'nis', 'nama', 'kelas'] },
      ],
      order: [['siswa_id', 'ASC'], ['mapel_id', 'ASC']]
    });

    if (nilaiData.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data nilai yang cocok dengan filter yang diberikan untuk diproses' });
    }

    // --- 3. Transformasi Data (Pivot) ---
    const pivotedData = nilaiData.reduce((acc, item) => {
      if (!item.siswa) return acc;
      const { siswa_id } = item;
      if (!acc[siswa_id]) {
        acc[siswa_id] = {
          siswa_id: item.siswa_id,
          nis: item.siswa.nis,
          nama: item.siswa.nama,
          kelas: item.siswa.kelas,
          semester: item.semester,
          tahun_ajaran: item.tahun_ajaran,
          nilai: {}
        };
      }
      acc[siswa_id].nilai[item.mapel_id] = parseFloat(item.nilai);
      return acc;
    }, {});

    const dataForKMeans = Object.values(pivotedData).map(siswa => {
      const vector = mapelOrder.map(mapelId => siswa.nilai[mapelId] || 0);
      return { ...siswa, vector };
    });
    
    if (dataForKMeans.length < jumlah_cluster) {
      return res.status(400).json({ message: `Jumlah data siswa (${dataForKMeans.length}) kurang dari jumlah cluster (${jumlah_cluster})` });
    }

    // --- 4. Panggil Layanan Clustering (Flask) ---
    const flaskRequestData = {
      n_clusters: jumlah_cluster,
      data: dataForKMeans.map(item => ({
        id: item.siswa_id,
        vector: item.vector
      })),
    };

    const flaskResponse = await axios.post('http://localhost:5001/clustering', flaskRequestData);
    const { results: flaskResults, centroids: flaskCentroids } = flaskResponse.data;

    // Buat Map untuk mencari hasil cluster & jarak per siswa dengan cepat.
    const flaskResultMap = new Map(flaskResults.map(item => [item.id, { cluster: item.cluster, distance: item.distance }]));

    // --- 5. PEMBERIAN LABEL CLUSTER BERDASARKAN PERINGKAT (RANKING) ---
    // Logika ini menggantikan sistem ambang batas (threshold) yang lama.
    // Pelabelan sekarang didasarkan pada urutan centroid, yang lebih akurat
    // karena konsisten dengan bagaimana cluster dibentuk pada data yang dinormalisasi.

    const getLabelsByRank = (count) => {
      switch (count) {
        case 5: return ["Sangat Tinggi", "Tinggi", "Sedang", "Rendah", "Sangat Rendah"];
        case 4: return ["Sangat Tinggi", "Tinggi", "Sedang", "Rendah"];
        case 3: return ["Tinggi", "Sedang", "Rendah"];
        case 2: return ["Tinggi", "Rendah"];
        default: return Array.from({ length: count }, (_, i) => `Cluster ${i + 1}`);
      }
    };

    // Hitung rata-rata untuk setiap centroid untuk menentukan peringkatnya.
    // Centroid dengan rata-rata tertinggi adalah cluster "terbaik".
    const rankedCentroids = flaskCentroids
      .map((centroid, index) => ({
        originalIndex: index,
        // Hitung rata-rata dari vektor centroid
        average: centroid.reduce((sum, val) => sum + val, 0) / centroid.length,
      }))
      .sort((a, b) => b.average - a.average); // Urutkan dari tertinggi ke terendah

    // Dapatkan daftar label berdasarkan jumlah cluster
    const labels = getLabelsByRank(jumlah_cluster);

    // Buat pemetaan dari indeks cluster asli ke label peringkatnya.
    const clusterLabelMap = {};
    rankedCentroids.forEach((centroid, rank) => {
      // Jika ada 3 cluster, rank 0 akan mendapat label "Tinggi", rank 1 "Sedang", dst.
      clusterLabelMap[centroid.originalIndex] = labels[rank];
    });

    // --- 6. Simpan Hasil ke Database ---
    const resultsWithSiswa = dataForKMeans.map(originalSiswa => {
      const resultData = flaskResultMap.get(originalSiswa.siswa_id);
      return {
        ...originalSiswa,
        cluster: resultData ? resultData.cluster : null,
        distance: resultData ? resultData.distance : 0, // Ambil jarak dari hasil Flask
      };
    });

    // Hapus hasil clustering sebelumnya untuk semester & tahun ajaran yang spesifik
    await hasil_cluster.destroy({ where: { semester, tahun_ajaran } });

    const clusteringResultsToSave = resultsWithSiswa.map(c => ({
      siswa_id: c.siswa_id,
      // `cluster` menyimpan nomor cluster asli dari K-Means
      cluster: c.cluster,
      // `keterangan` diisi dengan label dari logika peringkat yang baru
      keterangan: clusterLabelMap[c.cluster],
      jarak_centroid: c.distance, // Gunakan jarak yang sudah didapat
      algoritma,
      jumlah_cluster,
      semester: c.semester,
      tahun_ajaran: c.tahun_ajaran,
    }));

    await hasil_cluster.bulkCreate(clusteringResultsToSave);

    res.json({ success: true, message: 'Clustering berhasil dijalankan' });

  } catch (error) {
    console.error('Run clustering error:', error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message || 'Terjadi kesalahan server saat clustering' });
  }
};


// The getClusteringResults, getClusteringStats, and clearClusteringResults functions
// can remain largely the same as they operate on the `hasil_cluster` table which
// retains a similar structure. Small adjustments might be needed if the response
// format from `runClustering` is different.

export const getClusteringResults = async (req, res) => {
  try {
    const { page = 1, limit = 10, cluster = '', all = false, semester, tahun_ajaran } = req.query;
    
    const whereClause = {};
    if (cluster) whereClause.keterangan = cluster;
    if (semester) whereClause.semester = semester;
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;

    const processResults = async (results) => {
      if (results.length === 0) {
        return [];
      }

      const siswaIds = results.map(r => r.siswa_id);
      
      // Menggunakan semester dan tahun_ajaran dari query, bukan dari hasil
      const nilaiWhereClause = {
        siswa_id: siswaIds,
      };
      if (semester) nilaiWhereClause.semester = semester;
      if (tahun_ajaran) nilaiWhereClause.tahun_ajaran = tahun_ajaran;

      const allNilai = await Nilai.findAll({
        where: nilaiWhereClause,
        attributes: ['siswa_id', 'nilai'],
      });

      const nilaiMap = allNilai.reduce((acc, n) => {
        if (!acc[n.siswa_id]) {
          acc[n.siswa_id] = [];
        }
        acc[n.siswa_id].push(parseFloat(n.nilai));
        return acc;
      }, {});

      const averageNilaiMap = Object.entries(nilaiMap).reduce((acc, [siswa_id, nilai_list]) => {
        const avg = nilai_list.reduce((sum, val) => sum + val, 0) / nilai_list.length;
        acc[siswa_id] = avg;
        return acc;
      }, {});

      return results.map(row => ({
        id: row.id,
        siswa_id: row.siswa_id,
        nis: row.siswa?.nis,
        nama: row.siswa?.nama,
        kelas: row.siswa?.kelas,
        cluster: row.cluster,
        keterangan: row.keterangan,
        jarak_centroid: row.jarak_centroid,
        algoritma: row.algoritma,
        jumlah_cluster: row.jumlah_cluster,
        nilai_rata_rata: averageNilaiMap[row.siswa_id]?.toFixed(2) || 'N/A',
      }));
    };

    if (all === 'true' || parseInt(limit) >= 1000) {
      const results = await hasil_cluster.findAll({
        where: whereClause,
        include: [{ model: Siswa, as: 'siswa', attributes: ['id', 'nis', 'nama', 'kelas'] }],
        order: [['created_at', 'DESC']],
      });

      const formattedResults = await processResults(results);
      const totalCount = await hasil_cluster.count({ where: whereClause });

      return res.json({
        success: true,
        data: formattedResults,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_items: totalCount,
          items_per_page: totalCount,
        },
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await hasil_cluster.findAndCountAll({
      where: whereClause,
      include: [{ model: Siswa, as: 'siswa', attributes: ['id', 'nis', 'nama', 'kelas'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
    });

    const formattedResults = await processResults(rows);

    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / parseInt(limit)),
        total_items: count,
        items_per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get clustering results error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
    });
  }
};


// Helper function to calculate stats
const calculateClusteringStats = async (whereClause, include = []) => {
  const totalResults = await hasil_cluster.count({ where: whereClause, include });

  if (totalResults === 0) {
    return {
      total_results: 0,
      cluster_distribution: {},
      average_distance: 0,
      algorithm_used: "N/A",
      clusters_count: 0
    };
  }

  const clusterStats = await hasil_cluster.findAll({
    where: whereClause,
    include,
    attributes: [
      'cluster',
      'keterangan',
      [Sequelize.fn('COUNT', Sequelize.col('hasil_cluster.id')), 'jumlah']
    ],
    group: ['cluster', 'keterangan'],
    raw: true
  });

  const latestClustering = await hasil_cluster.findOne({
    where: whereClause,
    include,
    order: [['created_at', 'DESC']],
  });

  const stats = {};
  if (Array.isArray(clusterStats)) {
    clusterStats.forEach(stat => {
      if (stat && stat.keterangan) {
        const label = String(stat.keterangan).toLowerCase();
        const count = parseInt(stat.jumlah, 10) || 0;
        stats[label] = {
          cluster_id: stat.cluster,
          count: count,
          percentage: totalResults > 0 ? ((count / totalResults) * 100).toFixed(1) : "0.0"
        };
      }
    });
  }

  const allDistances = await hasil_cluster.findAll({
    where: whereClause,
    include,
    attributes: ['jarak_centroid'],
    raw: true
  });

  let averageDistance = 0;
  if (Array.isArray(allDistances) && allDistances.length > 0) {
    const totalDistance = allDistances.reduce((sum, item) => {
      const distance = parseFloat(item.jarak_centroid);
      return sum + (isNaN(distance) ? 0 : distance);
    }, 0);
    averageDistance = totalDistance / allDistances.length;
  }

  return {
    total_results: totalResults,
    cluster_distribution: stats,
    average_distance: averageDistance,
    algorithm_used: latestClustering ? latestClustering.algoritma : "K-Means",
    clusters_count: latestClustering ? latestClustering.jumlah_cluster : 3
  };
};

export const getClusteringStats = async (req, res) => {
  try {
    const { semester, tahun_ajaran } = req.query;

    const whereClause = {};
    if (semester) whereClause.semester = semester;
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;

    const statsData = await calculateClusteringStats(whereClause);

    res.json({
      success: true,
      data: statsData
    });

  } catch (error) {
    console.error('Get clustering stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

export const clearClusteringResults = async (req, res) => {
  try {
    const { semester, tahun_ajaran } = req.query; // Mengambil dari query string

    const whereClause = {};
    // Hanya hapus semua jika tidak ada filter spesifik yang diberikan
    if (semester) whereClause.semester = semester;
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;

    if (Object.keys(whereClause).length === 0) {
        // Jika tidak ada filter, hapus semua (perilaku lama, tapi sekarang eksplisit)
        await hasil_cluster.destroy({ where: {}, truncate: true });
    } else {
        // Jika ada filter, hapus hanya yang cocok
        await hasil_cluster.destroy({ where: whereClause });
    }

    let message = 'Hasil clustering berhasil dihapus.';
    if (semester && tahun_ajaran) {
      message = `Hasil clustering untuk semester ${semester} tahun ajaran ${tahun_ajaran} berhasil dihapus.`;
    } else if (semester) {
      message = `Hasil clustering untuk semester ${semester} berhasil dihapus.`;
    } else if (tahun_ajaran) {
      message = `Hasil clustering untuk tahun ajaran ${tahun_ajaran} berhasil dihapus.`;
    }

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};
export const downloadClusteringReport = async (req, res) => {
  try {
    // --- 1. GET FILTERS AND FETCH DATA ---
    const { tahun_ajaran, semester, kelas } = req.query;
    const kelasList = Array.isArray(kelas) ? kelas : (kelas ? kelas.split(',') : []);

    const whereClause = {};
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;
    if (semester) whereClause.semester = semester;
    
    const siswaInclude = {
      model: Siswa,
      as: 'siswa',
      attributes: ['id', 'nis', 'nama', 'kelas'],
      where: {}
    };

    if (kelasList.length > 0) {
      siswaInclude.where.kelas = kelasList;
    }

    const DATA_LIMIT = 2000;
    const recordCount = await hasil_cluster.count({
      where: whereClause,
      include: [siswaInclude],
    });

    if (recordCount > DATA_LIMIT) {
      return res.status(400).json({
        message: `Data terlalu besar untuk diunduh (${recordCount} baris). Harap gunakan filter kelas yang lebih spesifik untuk mengurangi ukuran laporan.`,
      });
    }

    const results = await hasil_cluster.findAll({
      where: whereClause,
      include: [siswaInclude],
      order: [
        ['keterangan', 'ASC'],
        ['jarak_centroid', 'ASC']
      ],
    });

    const filteredResults = results.filter(r => r.siswa);

    if (filteredResults.length === 0) {
      return res.status(404).json({ message: "Tidak ada data untuk kriteria yang dipilih." });
    }

    // --- 2. CALCULATE AVERAGE GRADES ---
    const siswaIds = filteredResults.map(r => r.siswa_id);
    const nilaiWhereClause = { siswa_id: siswaIds };
    if (semester) nilaiWhereClause.semester = semester;
    if (tahun_ajaran) nilaiWhereClause.tahun_ajaran = tahun_ajaran;

    const allNilai = await Nilai.findAll({ where: nilaiWhereClause, attributes: ['siswa_id', 'nilai'] });

    const nilaiMap = allNilai.reduce((acc, n) => {
      if (!acc[n.siswa_id]) acc[n.siswa_id] = [];
      acc[n.siswa_id].push(parseFloat(n.nilai));
      return acc;
    }, {});

    const averageNilaiMap = Object.entries(nilaiMap).reduce((acc, [siswa_id, nilai_list]) => {
      const avg = nilai_list.reduce((sum, val) => sum + val, 0) / nilai_list.length;
      acc[siswa_id] = avg.toFixed(2);
      return acc;
    }, {});

    const finalResults = filteredResults.map(item => ({
        ...item.get({ plain: true }),
        siswa: item.siswa.get({ plain: true }),
        nilai_rata_rata: averageNilaiMap[item.siswa_id] || 'N/A',
    }));

    // --- 3. PDF GENERATION ---
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `Laporan-Clustering-${tahun_ajaran}-${semester}.pdf`.replace(/ /g, '_');
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Reusable function to draw tables with pagination
    const drawTable = (tableData, columnConfig, startY) => {
        let y = startY;
        const rowHeight = 20;
        const tableBottom = 780;

        // Header
        doc.fontSize(9).font('Helvetica-Bold');
        columnConfig.forEach(col => {
            doc.text(col.label, col.x, y, { width: col.width, align: 'left' });
        });
        y += rowHeight;
        doc.moveTo(columnConfig[0].x - 5, y - 5).lineTo(columnConfig[columnConfig.length-1].x + columnConfig[columnConfig.length-1].width, y - 5).stroke();

        // Rows
        doc.fontSize(8).font('Helvetica');
        tableData.forEach(row => {
            if (y > tableBottom) {
                doc.addPage();
                y = doc.page.margins.top;
                doc.fontSize(9).font('Helvetica-Bold');
                columnConfig.forEach(col => {
                    doc.text(col.label, col.x, y, { width: col.width, align: 'left' });
                });
                y += rowHeight;
                doc.moveTo(columnConfig[0].x - 5, y - 5).lineTo(columnConfig[columnConfig.length-1].x + columnConfig[columnConfig.length-1].width, y - 5).stroke();
                doc.fontSize(8).font('Helvetica');
            }
            
            columnConfig.forEach(col => {
                doc.text(row[col.key] !== null && row[col.key] !== undefined ? row[col.key].toString() : 'N/A', col.x, y, { width: col.width, align: 'left' });
            });
            y += rowHeight;
        });
        return y;
    };

    // --- PDF CONTENT ---

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('Laporan Hasil Clustering', { align: 'center' });
    doc.moveDown(0.5);
    const subHeader = `Tahun Ajaran: ${tahun_ajaran || 'Semua'} | Semester: ${semester || 'Semua'} | Kelas: ${kelasList.length > 0 ? kelasList.join(', ') : 'Semua'}`;
    doc.fontSize(10).font('Helvetica').text(subHeader, { align: 'center' });
    doc.moveDown(2);

    // Table 1: Ringkasan Hasil
    const totalSiswa = finalResults.length;
    const clusterDistribution = finalResults.reduce((acc, result) => {
        const label = result.keterangan;
        if (!acc[label]) acc[label] = 0;
        acc[label]++;
        return acc;
    }, {});
    
    const summaryData = Object.entries(clusterDistribution)
        .map(([label, count]) => ({
            nama_cluster: label,
            jumlah_siswa: count,
            persentase: ((count / totalSiswa) * 100).toFixed(1) + '%'
        }))
        .sort((a, b) => {
             const rank = { 'Sangat Tinggi': 1, 'Tinggi': 2, 'Sedang': 3, 'Rendah': 4, 'Sangat Rendah': 5 };
             return (rank[a.nama_cluster] || 99) - (rank[b.nama_cluster] || 99);
        });

    doc.fontSize(12).font('Helvetica-Bold').text('Tabel 1: Ringkasan Hasil per Cluster');
    doc.moveDown(0.5);
    const summaryTableConfig = [
        { key: 'nama_cluster', label: 'Nama Cluster', x: 40, width: 200 },
        { key: 'jumlah_siswa', label: 'Jumlah Siswa', x: 240, width: 150 },
        { key: 'persentase',   label: 'Persentase',   x: 390, width: 150 },
    ];
    let currentY = drawTable(summaryData, summaryTableConfig, doc.y);
    doc.y = currentY;
    doc.moveDown(2);

    // Table 2: Daftar Lengkap Siswa
    doc.fontSize(12).font('Helvetica-Bold').text('Tabel 2: Daftar Lengkap Siswa', 40);
    doc.moveDown(0.5);
    const fullListTableData = finalResults.map((item, index) => ({
        no: index + 1,
        nis: item.siswa.nis,
        nama: item.siswa.nama,
        kelas: item.siswa.kelas,
        cluster: item.cluster,
        keterangan: item.keterangan,
        rata_rata: item.nilai_rata_rata,
        jarak: parseFloat(item.jarak_centroid).toFixed(4),
    }));

    const fullListTableConfig = [
        { key: 'no',         label: 'NO',         x: 40,  width: 25 },
        { key: 'nis',        label: 'NIS',        x: 70,  width: 70 },
        { key: 'nama',       label: 'Nama',       x: 145, width: 130 },
        { key: 'kelas',      label: 'Kelas',      x: 280, width: 40 },
        { key: 'cluster',    label: 'Cluster',    x: 325, width: 40 },
        { key: 'keterangan', label: 'Keterangan', x: 370, width: 70 },
        { key: 'rata_rata',  label: 'Rata-rata',  x: 445, width: 50 },
        { key: 'jarak',      label: 'Jarak',      x: 500, width: 50 },
    ];
    currentY = drawTable(fullListTableData, fullListTableConfig, doc.y);
    doc.y = currentY;
    doc.moveDown(2);
    // Table 3: Detail per Cluster
    const groupedByCluster = finalResults.reduce((acc, result) => {
        const key = result.keterangan;
        if (!acc[key]) acc[key] = [];
        acc[key].push(result);
        return acc;
    }, {});
    
    const sortedClusters = Object.keys(groupedByCluster).sort((a, b) => {
         const rank = { 'Sangat Tinggi': 1, 'Tinggi': 2, 'Sedang': 3, 'Rendah': 4, 'Sangat Rendah': 5 };
         return (rank[a] || 99) - (rank[b] || 99);
    });

    for (const clusterName of sortedClusters) {
        doc.fontSize(12).font('Helvetica-Bold').text(`Tabel 3: Detail Cluster - ${clusterName}`, 40);
        doc.moveDown(0,5);

        const clusterData = groupedByCluster[clusterName].map((item, index) => ({
            no: index + 1,
            nis: item.siswa.nis,
            nama: item.siswa.nama,
            kelas: item.siswa.kelas,
            cluster: item.cluster,
            keterangan: item.keterangan,
            rata_rata: item.nilai_rata_rata,
            jarak: parseFloat(item.jarak_centroid).toFixed(4),
        }));

        drawTable(clusterData, fullListTableConfig, doc.y);
        doc.moveDown(2);
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ message: 'Gagal membuat laporan PDF.' });
  }
};