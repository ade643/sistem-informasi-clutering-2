import { Op, Sequelize } from 'sequelize';
import * as xlsx from 'xlsx';
import Nilai from '../model/nilaiModel.js';
import Siswa from '../model/siswaModel.js';
import MataPelajaran from '../model/mapelModel.js';
import RiwayatUpload from '../model/riwayatUploadModel.js';
import db from '../config/database.js';


// Endpoint baru untuk mengambil semua mata pelajaran
export const getAllMapel = async (req, res) => {
  try {
    const mapel = await MataPelajaran.findAll({ order: [['nama_mapel', 'ASC']] });
    res.json({ success: true, data: mapel });
  } catch (error) {
    console.error('Get all mapel error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

export const createMapel = async (req, res) => {
  const { nama_mapel } = req.body;

  if (!nama_mapel || nama_mapel.trim() === '') {
    return res.status(400).json({ success: false, message: 'Nama mata pelajaran tidak boleh kosong.' });
  }

  try {
    // Check for existing subject (case-insensitive)
    const existingMapel = await MataPelajaran.findOne({
      where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('nama_mapel')), Sequelize.fn('LOWER', nama_mapel.trim()))
    });

    if (existingMapel) {
      return res.status(409).json({ success: false, message: 'Mata pelajaran dengan nama tersebut sudah ada.' });
    }

    const newMapel = await MataPelajaran.create({ nama_mapel: nama_mapel.trim() });
    res.status(201).json({ success: true, message: 'Mata pelajaran berhasil ditambahkan.', data: newMapel });
  } catch (error) {
    console.error('Create mapel error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server saat menambahkan mata pelajaran.' });
  }
};

export const getAllNilai = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', semester = '', tahun_ajaran = '', kelas = '', all = 'false' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 1. Build a subquery to find distinct grade reports (siswa_id, semester, tahun_ajaran)
    // and filter them by student name if there is a search term.
    let whereClause = {};
    if (semester) whereClause.semester = semester;
    if (tahun_ajaran) whereClause.tahun_ajaran = tahun_ajaran;
    if (kelas) whereClause.kelas_snapshot = kelas;

    let siswaWhereClause = {};
    if (search) {
      siswaWhereClause.nama = { [Op.like]: `%${search}%` };
    }

    // 2. Find all distinct reports that match the criteria
    const distinctReports = await Nilai.findAll({
      where: whereClause,
      attributes: [
        'siswa_id',
        'semester',
        'tahun_ajaran',
        'kelas_snapshot',
        [db.fn('MAX', db.col('nilai.created_at')), 'latest_created_at']
      ],
      include: [{
        model: Siswa,
        as: 'siswa',
        where: siswaWhereClause,
        attributes: []
      }],
      group: ['siswa_id', 'semester', 'tahun_ajaran', 'kelas_snapshot'],
      order: [[db.fn('MAX', db.col('nilai.created_at')), 'DESC']],
      raw: true
    });

    const totalItems = distinctReports.length;
    if (totalItems === 0) {
      return res.json({ success: true, data: [], pagination: { total_items: 0, total_pages: 0, current_page: 1 } });
    }

    // 3. Paginate the reports if not fetching all
    const reportsToProcess = all === 'true' ? distinctReports : distinctReports.slice(offset, offset + parseInt(limit));
    const siswaIdsForPage = reportsToProcess.map(r => r.siswa_id);

    // 4. Fetch full grade data for the reports on the current page
    const nilaiData = await Nilai.findAll({
      where: {
        siswa_id: { [Op.in]: siswaIdsForPage }
      },
      include: [
        { model: Siswa, as: 'siswa', attributes: ['nis', 'nama', 'kelas'] },
        { model: MataPelajaran, as: 'mata_pelajaran', attributes: ['nama_mapel'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // 5. Group the results by student report for a clean output
    const groupedBySiswa = reportsToProcess.map(report => {
      const siswaData = nilaiData.find(n => n.siswa_id === report.siswa_id)?.siswa;
      const nilaiForSiswa = nilaiData
        .filter(n =>
          n.siswa_id === report.siswa_id &&
          n.semester === report.semester &&
          n.tahun_ajaran === report.tahun_ajaran &&
          n.kelas_snapshot === report.kelas_snapshot
        )
        .map(n => ({
          mapel_id: n.mapel_id,
          nama_mapel: n.mata_pelajaran.nama_mapel,
          nilai: n.nilai
        }));

      return {
        siswa_id: report.siswa_id,
        nis: siswaData?.nis,
        nama: siswaData?.nama,
        kelas: report.kelas_snapshot || siswaData?.kelas,
        semester: report.semester,
        tahun_ajaran: report.tahun_ajaran,
        nilai: nilaiForSiswa
      };
    });

    res.json({
      success: true,
      data: groupedBySiswa,
      pagination: {
        total_items: totalItems,
        total_pages: all === 'true' ? 1 : Math.ceil(totalItems / parseInt(limit)),
        current_page: all === 'true' ? 1 : parseInt(page),
      }
    });
  } catch (error) {
    console.error('Get all nilai error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};


export const createOrUpdateNilai = async (req, res) => {
  const t = await db.transaction();
  try {
    const {
      siswa_id,
      semester,
      tahun_ajaran,
      kelas,
      nilai // expected to be an array of { mapel_id: x, nilai: y }
    } = req.body;

    if (!siswa_id || !semester || !tahun_ajaran || !Array.isArray(nilai)) {
      return res.status(400).json({ message: 'Input tidak valid. Pastikan semua field terisi.' });
    }

    const siswa = await Siswa.findByPk(siswa_id, { transaction: t });
    if (!siswa) {
      return res.status(404).json({ message: 'Data siswa tidak ditemukan.' });
    }
    const kelasSnapshot = kelas || siswa.kelas;

    // Delete existing nilai for this student and semester/tahun_ajaran
    await Nilai.destroy({
      where: { siswa_id, semester, tahun_ajaran },
      transaction: t
    });

    // Prepare data for bulk insert
    const nilaiToCreate = nilai.map(n => {
      if (n.nilai === null || n.nilai === '' || isNaN(parseFloat(n.nilai))) {
        throw new Error(`Nilai untuk mapel_id ${n.mapel_id} tidak valid.`);
      }
      return {
        siswa_id,
        semester,
        tahun_ajaran,
        kelas_snapshot: kelasSnapshot,
        mapel_id: n.mapel_id,
        nilai: parseFloat(n.nilai)
      };
    });

    // Bulk insert new nilai
    const createdNilai = await Nilai.bulkCreate(nilaiToCreate, { transaction: t, validate: true });

    await t.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Data nilai berhasil disimpan', 
      data: createdNilai 
    });

  } catch (error) {
    await t.rollback();
    console.error('Create/Update nilai error:', error);
    res.status(500).json({ success: false, message: error.message || 'Terjadi kesalahan server' });
  }
};

export const uploadNilaiFromExcel = async (req, res) => {
  const { kelas, tahun_ajaran, semester } = req.body;
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
  }
  if (!kelas || !tahun_ajaran || !semester) {
    return res.status(400).json({ success: false, message: 'Input Kelas, Tahun Ajaran, dan Semester tidak boleh kosong.' });
  }

  // Create an audit log for the upload attempt
  try {
    await RiwayatUpload.create({
      nama_file: req.file.originalname,
      kelas,
      semester,
      tahun_ajaran,
      user_id: req.user?.id, // Use optional chaining in case user is not on req
      file_path: req.file.path, // Assuming multer provides the file path
    });
  } catch (logError) {
    console.error('Failed to log upload history:', logError);
    // We don't stop the main process, but we log the failure
  }

  const t = await db.transaction();
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length > 0) {
      console.log('[DIAGNOSTIK] Nama kolom dari Excel (setelah normalisasi):', Object.keys(jsonData[0]).map(h => h.toLowerCase().replace(/\s+/g, '')));
    }

    if (jsonData.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'File Excel kosong atau format tidak sesuai.' });
    }

    // 1. Get all subjects to map names to IDs
    const allMapel = await MataPelajaran.findAll({ transaction: t });
    const mapelNameToId = allMapel.reduce((acc, mapel) => {
      // Normalize names for comparison (e.g., lowercase and remove spaces)
      acc[mapel.nama_mapel.toLowerCase().replace(/\s+/g, '')] = mapel.id;
      return acc;
    }, {});

    const errors = [];
    const nilaiToCreate = [];
    const studentsToProcess = new Map(); // To track which students' grades are being updated

    for (const [index, row] of jsonData.entries()) {
      const nis = row.NIS?.toString();
      const namaSiswa = row.Nama?.toString();

      if (!nis || !namaSiswa) {
        errors.push(`Baris ${index + 2}: Kolom NIS atau Nama tidak boleh kosong.`);
        continue;
      }

      let siswa = await Siswa.findOne({ where: { nis }, transaction: t });

      if (!siswa) {
        try {
          siswa = await Siswa.create({
            nis,
            nama: namaSiswa,
            kelas, // Use class from form input
            // Provide sensible defaults for other required fields
            jenis_kelamin: 'L', 
            tanggal_lahir: new Date(),
            alamat: 'Belum diisi',
            telepon: '0000',
          }, { transaction: t });
        } catch (validationError) {
          errors.push(`Baris ${index + 2}: Gagal membuat siswa baru untuk NIS ${nis}. Error: ${validationError.message}`);
          continue;
        }
      }

      // Mark this student for grade deletion to ensure a clean update
      if (!studentsToProcess.has(siswa.id)) {
          studentsToProcess.set(siswa.id, { semester, tahun_ajaran });
      }

      // Iterate over columns in the row to find subject grades
      for (const colName in row) {
        if (colName.toLowerCase() === 'nis' || colName.toLowerCase() === 'nama') continue;

        const normalizedColName = colName.toLowerCase().replace(/\s+/g, '');
        const mapelId = mapelNameToId[normalizedColName];
        
        if (mapelId) {
          const nilai = parseFloat(row[colName]);
          if (row[colName] !== null && !isNaN(nilai)) {
            nilaiToCreate.push({
              siswa_id: siswa.id,
              mapel_id: mapelId,
              semester,
              tahun_ajaran,
              kelas_snapshot: kelas,
              nilai,
            });
          } else if (row[colName] !== null && row[colName] !== '') {
            // Handle cases where the value is present but not a valid number
            errors.push(`Baris ${index + 2}: Nilai untuk mata pelajaran '${colName}' (${row[colName]}) tidak valid.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      await t.rollback();
      // Return a 422 Unprocessable Entity status for validation errors
      return res.status(422).json({ 
        success: false, 
        message: 'Ditemukan kesalahan validasi pada file. Tidak ada data yang disimpan.', 
        errors 
      });
    }

    // Delete existing grades for all students in the file for the given semester/year
    for (const [siswa_id, period] of studentsToProcess.entries()) {
        await Nilai.destroy({ 
            where: { 
                siswa_id: siswa_id, 
                semester: period.semester, 
                tahun_ajaran: period.tahun_ajaran 
            }, 
            transaction: t 
        });
    }

    // Bulk create new grades
    if (nilaiToCreate.length > 0) {
      await Nilai.bulkCreate(nilaiToCreate, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ 
      success: true, 
      message: `Upload berhasil. ${nilaiToCreate.length} data nilai telah berhasil diimpor/diperbarui.`,
    });

  } catch (error) {
    await t.rollback();
    console.error('Upload Excel error:', error);
    res.status(500).json({ success: false, message: error.message || 'Terjadi kesalahan server saat memproses file.' });
  }
};


export const deleteNilaiBySiswa = async (req, res) => {
  try {
    const { siswa_id, semester, tahun_ajaran } = req.query;
    if (!siswa_id || !semester || !tahun_ajaran) {
        return res.status(400).json({ message: 'Parameter siswa_id, semester, dan tahun_ajaran diperlukan' });
    }

    const result = await Nilai.destroy({ where: { siswa_id, semester, tahun_ajaran } });

    if (result === 0) {
        return res.status(404).json({ success: false, message: 'Data nilai tidak ditemukan' });
    }

    res.json({ success: true, message: 'Semua data nilai untuk siswa pada periode ini berhasil dihapus' });
  } catch (error) {
    console.error('Delete nilai error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

export const getNilaiFilters = async (req, res) => {
  try {
    const tahunAjaran = await Nilai.findAll({
      attributes: [[db.fn('DISTINCT', db.col('tahun_ajaran')), 'tahun_ajaran']],
      order: [['tahun_ajaran', 'DESC']],
    });
    const semester = await Nilai.findAll({
      attributes: [[db.fn('DISTINCT', db.col('semester')), 'semester']],
      order: [['semester', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        tahun_ajaran: tahunAjaran.map(item => item.tahun_ajaran),
        semester: semester.map(item => item.semester),
      },
    });
  } catch (error) {
    console.error('Get nilai filters error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};
export const getNilaiBySiswa = async (req, res) => {
  try {
    const { siswa_id } = req.params;
    const { semester, tahun_ajaran } = req.query;

    if (!semester || !tahun_ajaran) {
      return res.status(400).json({ message: 'Semester dan Tahun Ajaran diperlukan' });
    }

    const nilaiSiswa = await Nilai.findAll({
      where: {
        siswa_id,
        semester,
        tahun_ajaran,
      },
      include: [{
        model: MataPelajaran,
        as: 'mata_pelajaran',
        attributes: ['nama_mapel'],
      }],
      order: [['mapel_id', 'ASC']],
    });

    if (!nilaiSiswa || nilaiSiswa.length === 0) {
      return res.status(404).json({ message: 'Data nilai tidak ditemukan untuk siswa pada periode ini.' });
    }

    const formattedNilai = nilaiSiswa.map(n => ({
      mapel: n.mata_pelajaran.nama_mapel,
      nilai: parseFloat(n.nilai),
    }));

    res.json({ success: true, data: formattedNilai });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

export const getNilaiUploadHistory = async (req, res) => {
  try {
    const history = await RiwayatUpload.findAll({
      // Mengganti 'tanggal_upload' dengan 'created_at' karena model menggunakan timestamps
      order: [['created_at', 'DESC']], 
    });
    
    // Mengubah format data agar sesuai dengan apa yang diharapkan oleh frontend
    const formattedHistory = history.map(item => ({
      id: item.id_upload,
      nama_file: item.nama_file,
      kelas: item.kelas,
      semester: item.semester,
      tahun_ajaran: item.tahun_ajaran,
      tanggal_upload: item.created_at, // Menggunakan created_at
    }));

    res.json({ success: true, data: formattedHistory });
  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil riwayat unggahan.',
    });
  }
};
