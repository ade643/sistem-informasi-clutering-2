-- Tambah snapshot kelas historis pada nilai dan hasil clustering.
-- Jalankan pada database produksi sebelum deploy kode baru.

ALTER TABLE nilai
  ADD COLUMN kelas_snapshot VARCHAR(20) NULL AFTER tahun_ajaran;

ALTER TABLE hasil_cluster
  ADD COLUMN kelas_snapshot VARCHAR(20) NULL AFTER tahun_ajaran;

-- Backfill data lama dari kelas siswa saat ini.
UPDATE nilai n
JOIN siswa s ON s.id = n.siswa_id
SET n.kelas_snapshot = s.kelas
WHERE n.kelas_snapshot IS NULL OR n.kelas_snapshot = '';

UPDATE hasil_cluster h
JOIN siswa s ON s.id = h.siswa_id
SET h.kelas_snapshot = s.kelas
WHERE h.kelas_snapshot IS NULL OR h.kelas_snapshot = '';

-- Setelah verifikasi data, jadikan NOT NULL.
ALTER TABLE nilai
  MODIFY kelas_snapshot VARCHAR(20) NOT NULL;

ALTER TABLE hasil_cluster
  MODIFY kelas_snapshot VARCHAR(20) NOT NULL;

-- Index untuk query period + class.
CREATE INDEX idx_nilai_period_class_student
  ON nilai (tahun_ajaran, semester, kelas_snapshot, siswa_id);

CREATE INDEX idx_hasil_cluster_period_class
  ON hasil_cluster (tahun_ajaran, semester, kelas_snapshot);
