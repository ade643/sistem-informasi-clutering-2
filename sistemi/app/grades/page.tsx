'use client'

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, Search, Edit, Trash2, UploadCloud, Download, FileCheck2, AlertCircle, History, BookMarked } from "lucide-react"
import Link from "next/link";
import apiService, { downloadTemplate } from "@/lib/api"

// Interfaces
interface NilaiDetail {
  mapel_id: number;
  nama_mapel: string;
  nilai: string;
}

interface GradeEntry {
  siswa_id: number;
  nis: string;
  nama: string;
  kelas: string;
  semester: string;
  tahun_ajaran: string;
  nilai: NilaiDetail[];
}

interface Siswa {
  id: number;
  nama: string;
  nis: string;
  kelas: string;
}

interface Mapel {
  id: number;
  nama_mapel: string;
}

export default function GradesPage() {
  const [grades, setGrades] = useState<GradeEntry[]>([])
  const [students, setStudents] = useState<Siswa[]>([]) // Re-introduce students state
  const [searchTerm, setSearchTerm] = useState("")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedGradeDetails, setSelectedGradeDetails] = useState<GradeEntry | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // State for upload dialog
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for filters in upload dialog
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>("");
  const [selectedTahunAjaranFilter, setSelectedTahunAjaranFilter] = useState<string>("");

  // State for Mapel Dialog
  const [isMapelDialogOpen, setIsMapelDialogOpen] = useState(false);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [mapelLoading, setMapelLoading] = useState(false);
  const [newMapelName, setNewMapelName] = useState("");
  const [isSubmittingMapel, setIsSubmittingMapel] = useState(false);
  const [mapelSubmitError, setMapelSubmitError] = useState<string | null>(null);
  const [mapelSubmitSuccess, setMapelSubmitSuccess] = useState<string | null>(null);

  // States for Grade Detail/Edit Dialog
  const [isEditing, setIsEditing] = useState(false);
  const [editableGrades, setEditableGrades] = useState<NilaiDetail[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSuccess, setDetailSuccess] = useState<string | null>(null);


  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [gradesRes, studentsRes] = await Promise.all([
        apiService.getNilai({ all: 'true' }),
        apiService.getSiswa(), // Fetch students again
      ])
      setGrades(gradesRes.data)
      setStudents(studentsRes.data)
    } catch (error: any) {
      setError(error.message || "Gagal memuat data awal")
    } finally {
      setLoading(false)
    }
  }

  const filteredGrades = useMemo(() => 
    grades.filter((grade) =>
      grade.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.nis.includes(searchTerm) ||
      grade.semester.toLowerCase().includes(searchTerm.toLowerCase())
    ), [grades, searchTerm]);

  const handleDelete = async (grade: GradeEntry) => {
    if (confirm(`Hapus semua nilai untuk ${grade.nama} semester ${grade.semester} ${grade.tahun_ajaran}?`)) {
      try {
        await apiService.deleteNilaiBySiswa(grade.siswa_id, grade.semester, grade.tahun_ajaran)
        fetchInitialData() // Refresh data
      } catch (error: any) {
        setError(error.message || "Gagal menghapus data nilai")
      }
    }
  }

  const handleViewDetails = (grade: GradeEntry) => {
    setSelectedGradeDetails(grade);
    // Deep copy for editing to avoid mutating original state
    setEditableGrades(JSON.parse(JSON.stringify(grade.nilai)));
    setIsEditing(false);
    setDetailError(null);
    setDetailSuccess(null);
    setIsDetailDialogOpen(true);
  };

  const handleGradeChange = (mapel_id: number, value: string) => {
    setEditableGrades(currentGrades =>
      currentGrades.map(g =>
        g.mapel_id === mapel_id ? { ...g, nilai: value } : g
      )
    );
  };

  const handleSaveGrades = async () => {
    if (!selectedGradeDetails) return;

    setIsSaving(true);
    setDetailError(null);
    setDetailSuccess(null);

    const payload = {
      siswa_id: selectedGradeDetails.siswa_id,
      semester: selectedGradeDetails.semester,
      tahun_ajaran: selectedGradeDetails.tahun_ajaran,
      nilai: editableGrades.map(g => ({ mapel_id: g.mapel_id, nilai: g.nilai })),
    };

    try {
      const response = await apiService.createOrUpdateNilai(payload);
      setDetailSuccess(response.message || "Nilai berhasil diperbarui.");
      await fetchInitialData(); // Refresh the main list
      setIsEditing(false);
    } catch (error: any) {
      setDetailError(error.message || "Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const calculateAverage = (nilai: NilaiDetail[]) => {
    if (!nilai || nilai.length === 0) return "N/A";
    const total = nilai.reduce((sum, item) => sum + parseFloat(item.nilai), 0);
    const validItems = nilai.filter(item => !isNaN(parseFloat(item.nilai))).length;
    if (validItems === 0) return "N/A";
    return (total / validItems).toFixed(2);
  }

  // --- Upload Handlers ---
  const handleOpenUploadDialog = () => {
    setSelectedFile(null);
    setUploadError(null);
    setValidationErrors([]);
    setUploadSuccess(null);
    setSelectedClassFilter(""); // Reset filters
    setSelectedSemesterFilter("");
    setSelectedTahunAjaranFilter("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsUploadDialogOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
      setValidationErrors([]);
      setUploadSuccess(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setUploadError("Pilih file Excel terlebih dahulu.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setValidationErrors([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (selectedClassFilter) formData.append('kelas', selectedClassFilter);
    if (selectedSemesterFilter) formData.append('semester', selectedSemesterFilter);
    if (selectedTahunAjaranFilter) formData.append('tahun_ajaran', selectedTahunAjaranFilter);

    try {
      const response = await apiService.uploadNilaiExcel(formData);
      setUploadSuccess(response.message);
      fetchInitialData(); // Refresh data on success
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        setUploadError("Terjadi kesalahan validasi pada file:");
        setValidationErrors(error.errors);
      } else {
        setUploadError(error.message || "Gagal mengunggah file.");
        setValidationErrors([]);
      }
    } finally {
      setUploading(false);
    }
  };

  // --- Mapel Handlers ---
  const fetchMapel = async () => {
    setMapelLoading(true);
    try {
      const response = await apiService.getMapel();
      setMapelList(response.data || []);
    } catch (error: any) {
      setMapelSubmitError(error.message || "Gagal memuat data mata pelajaran");
    } finally {
      setMapelLoading(false);
    }
  };

  const handleOpenMapelDialog = () => {
    setIsMapelDialogOpen(true);
    setNewMapelName("");
    setMapelSubmitError(null);
    setMapelSubmitSuccess(null);
    fetchMapel();
  };

  const handleCreateMapel = async () => {
    if (!newMapelName.trim()) {
      setMapelSubmitError("Nama mata pelajaran tidak boleh kosong.");
      return;
    }
    setIsSubmittingMapel(true);
    setMapelSubmitError(null);
    setMapelSubmitSuccess(null);
    try {
      const response = await apiService.createMapel({ nama_mapel: newMapelName });
      setMapelSubmitSuccess(response.message);
      setNewMapelName("");
      await fetchMapel(); // Refresh the list
    } catch (error: any) {
      setMapelSubmitError(error.message || "Gagal menambahkan mata pelajaran.");
    } finally {
      setIsSubmittingMapel(false);
    }
  };

  if (loading) {
    return <div>Memuat data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Nilai Siswa</h1>
          <p className="text-muted-foreground">Impor dan kelola data nilai siswa melalui file Excel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenMapelDialog}>
            <BookMarked className="mr-2 h-4 w-4" />
            Kelola Mata Pelajaran
          </Button>
          <Link href="/grades/history">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              Lihat Riwayat
            </Button>
          </Link>
          <Button onClick={handleOpenUploadDialog}> <UploadCloud className="mr-2 h-4 w-4" /> Impor Nilai </Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Laporan Nilai</CardTitle>
           <CardDescription>Data nilai yang ditampilkan dikelompokkan per siswa per periode.</CardDescription>
          <div className="relative flex-1 max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari nama, NIS, atau semester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Tahun Ajaran</TableHead>
                <TableHead>Rata-rata</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrades.map((grade) => (
                <TableRow key={`${grade.siswa_id}-${grade.semester}-${grade.tahun_ajaran}`}>
                  <TableCell>{grade.nis}</TableCell>
                  <TableCell>{grade.nama}</TableCell>
                  <TableCell><Badge variant="outline">{grade.kelas}</Badge></TableCell>
                  <TableCell>{grade.semester}</TableCell>
                  <TableCell>{grade.tahun_ajaran}</TableCell>
                  <TableCell><Badge>{calculateAverage(grade.nilai)}</Badge></TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="sm" onClick={() => handleViewDetails(grade)} className="text-blue-600 hover:text-blue-700 mr-2">
                        Lihat Detail
                      </Button>
                     <Button variant="ghost" size="sm" onClick={() => handleDelete(grade)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for Excel Upload */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impor Nilai dari Excel</DialogTitle>
            <DialogDescription>Unggah file .xlsx untuk menambahkan atau memperbarui nilai siswa secara massal.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {uploadSuccess && (
              <Alert variant="success">
                <FileCheck2 className="h-4 w-4" />
                <AlertTitle>Berhasil!</AlertTitle>
                <AlertDescription>{uploadSuccess}</AlertDescription>
              </Alert>
            )}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Unggah</AlertTitle>
                <AlertDescription>
                  {uploadError}
                  {validationErrors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-xs">
                      {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {!uploadSuccess && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="filter-kelas">Kelas</Label>
                    <Input
                      id="filter-kelas"
                      placeholder="Masukkan Kelas"
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-semester">Semester</Label>
                    <Select required value={selectedSemesterFilter} onValueChange={(value) => setSelectedSemesterFilter(value === 'all' ? '' : value)}>
                      <SelectTrigger id="filter-semester"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" disabled>Pilih Semester</SelectItem>
                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                        <SelectItem value="Genap">Genap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-tahun-ajaran">Tahun Ajaran</Label>
                    <Input
                      id="filter-tahun-ajaran"
                      placeholder="Cth: 2023/2024"
                      value={selectedTahunAjaranFilter}
                      onChange={(e) => setSelectedTahunAjaranFilter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label htmlFor="file-upload">Pilih File Excel</Label>
                   <Input id="file-upload" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} ref={fileInputRef} />
                   <p className="text-xs text-muted-foreground">
                     File harus berformat .xlsx. Pastikan kolom sesuai dengan template.
                   </p>
                </div>
              </>
            )}

          </div>
          <DialogFooter>
            {!uploadSuccess && <Button onClick={downloadTemplate} variant="outline"><Download className="mr-2 h-4 w-4"/> Unduh Template</Button>}
            {!uploadSuccess && <Button onClick={handleUploadSubmit} disabled={!selectedFile || uploading}>
              {uploading ? "Mengunggah..." : "Unggah File"}
            </Button>}
            {uploadSuccess && <Button onClick={() => setIsUploadDialogOpen(false)}>Tutup</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Grade Details */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit' : 'Detail'} Nilai {selectedGradeDetails?.nama}</DialogTitle>
            <DialogDescription>
              Semester: {selectedGradeDetails?.semester} | Tahun Ajaran: {selectedGradeDetails?.tahun_ajaran}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {detailSuccess && <Alert variant="success"><FileCheck2 className="h-4 w-4" /><AlertTitle>Berhasil!</AlertTitle><AlertDescription>{detailSuccess}</AlertDescription></Alert>}
            {detailError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{detailError}</AlertDescription></Alert>}

            {isEditing ? (
              <div className="space-y-2">
                {editableGrades.map((item) => (
                  <div key={item.mapel_id} className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor={`grade-${item.mapel_id}`} className="col-span-1">{item.nama_mapel}</Label>
                    <Input
                      id={`grade-${item.mapel_id}`}
                      type="number"
                      value={item.nilai}
                      onChange={(e) => handleGradeChange(item.mapel_id, e.target.value)}
                      className="col-span-2"
                      min="0"
                      max="100"
                    />
                  </div>
                ))}
              </div>
            ) : (
              selectedGradeDetails?.nilai && selectedGradeDetails.nilai.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableGrades.map((item) => (
                      <TableRow key={item.mapel_id}>
                        <TableCell>{item.nama_mapel}</TableCell>
                        <TableCell className="text-right">{item.nilai}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>Tidak ada detail nilai yang tersedia.</p>
              )
            )}
          </div>
          <DialogFooter>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Batal</Button>
                <Button onClick={handleSaveGrades} disabled={isSaving}>
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button onClick={() => setIsDetailDialogOpen(false)}>Tutup</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Mapel List */}
      <Dialog open={isMapelDialogOpen} onOpenChange={setIsMapelDialogOpen}>
        <DialogContent className="max-w-2xl">
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Tambah Mata Pelajaran Baru</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: Kimia"
                  value={newMapelName}
                  onChange={(e) => setNewMapelName(e.target.value)}
                  disabled={isSubmittingMapel}
                />
                <Button onClick={handleCreateMapel} disabled={isSubmittingMapel}>
                  {isSubmittingMapel ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              {mapelSubmitError && <p className="text-sm text-red-600 mt-2">{mapelSubmitError}</p>}
              {mapelSubmitSuccess && <p className="text-sm text-green-600 mt-2">{mapelSubmitSuccess}</p>}
            </div>
          <div className="pt-4 border-t">
          <DialogHeader>
            <DialogTitle>Daftar Mata Pelajaran</DialogTitle>
            <DialogDescription>Berikut adalah semua mata pelajaran yang terdaftar di sistem. Gunakan nama ini sebagai header kolom di file Excel Anda.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {mapelLoading ? (
              <p>Memuat data mata pelajaran...</p>
            ) : mapelList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nama Mata Pelajaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapelList.map((mapel) => (
                    <TableRow key={mapel.id}>
                      <TableCell>{mapel.id}</TableCell>
                      <TableCell>{mapel.nama_mapel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>Tidak ada data mata pelajaran yang ditemukan.</p>
            )}
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMapelDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
