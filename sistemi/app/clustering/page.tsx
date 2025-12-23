'use client'

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Play, Trash2, Download, Filter } from "lucide-react"
import apiService from "@/lib/api"
import { StudentGradeDetailModal } from '@/components/student-grade-detail-modal'
import { DownloadReportModal } from "@/components/download-report-modal";


// Struktur data hasil clustering yang diterima dari backend
interface ClusteringResult {
  id: number
  siswa_id: number
  cluster: number
  keterangan: string   // label cluster dari backend
  jarak_centroid: number
  algoritma: string
  jumlah_cluster: number
  created_at: string
  nis?: string
  nama?: string
  kelas?: string
  nilai_rata_rata: number;
  semester: string;
  tahun_ajaran: string;
}

// Struktur data statistik clustering yang ditampilkan di dashboard
interface ClusteringStats {
  total_results: number
  cluster_distribution: Array<{
    cluster_id: number;
    label: string;
    count: number;
    percentage: string;
  }>
  average_distance: number
  algorithm_used: string
  clusters_count: number
}

// Struktur filter nilai berdasarkan tahun ajaran, semester, dan kelas
interface NilaiFilters {
  tahun_ajaran: string[];
  semester: string[];
  kelas: string[];
}

export default function ClusteringPage() {
  // State utama
  const [results, setResults] = useState<ClusteringResult[]>([])
  const [stats, setStats] = useState<ClusteringStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")

  // State untuk detail siswa (modal)
  const [detailSiswa, setDetailSiswa] = useState<ClusteringResult | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);



  

  // State untuk menyimpan opsi filter yang tersedia
  const [filters, setFilters] = useState<NilaiFilters>({ tahun_ajaran: [], semester: [], kelas: [] });

  // State untuk filter sumber data (input form)
  const [selectedFilters, setSelectedFilters] = useState({
    tahun_ajaran: "",
    semester: "",
    kelas: "",
  });

  const handleDownloadReport = async (selectedFilters: {
    tahun_ajaran: string;
    semester: string;
    kelas: string[];
  }) => {
    try {
      const response = await apiService.downloadClusteringReport(selectedFilters);

      // Cek jika respons TIDAK sukses (misal: error 400, 500)
      if (!response.ok) {
        // Coba parsing body error sebagai JSON
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Gagal membuat laporan (status: ${response.status}).`;
        setError(errorMessage);
        return; // Hentikan eksekusi
      }

      // Jika respons sukses, proses sebagai file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `Laporan_Clustering.pdf`; // Default filename
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError(""); // Hapus error jika sukses

    } catch (error: any) {
      console.error("Gagal mengunduh laporan:", error);
      setError(error.message || "Gagal mengunduh laporan. Periksa konsol untuk detail.");
    }
  };

  // State untuk filter yang aktif digunakan untuk menampilkan data di tabel
  const [activeFilters, setActiveFilters] = useState({
    tahun_ajaran: "",
    semester: "",
    kelas: "",
  });

  // State untuk filter hasil clustering di tabel
  const [clusterFilter, setClusterFilter] = useState(""); // "" = Semua Cluster

  // State pemicu untuk memaksa re-fetch data
  const [runCounter, setRunCounter] = useState(0);

  // Fetch data clustering setiap kali filter AKTIF, NAMA CLUSTER, atau pemicu RUNCOUNTER berubah
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchClusteringData = async () => {
      if (!activeFilters.tahun_ajaran || !activeFilters.semester || !activeFilters.kelas) {
        setResults([]);
        setStats(null);
        return;
      }

      setLoading(true);
      try {
        const apiParams = { ...activeFilters, cluster: clusterFilter, all: 'true' };
        const statsParams = { ...activeFilters };

        const [resultsResponse, statsResponse] = await Promise.all([
          apiService.getClusteringResults(apiParams, signal),
          apiService.getClusteringStats(statsParams, signal),
        ]);

        const resultsWithPeriod = resultsResponse.data.map((res: any) => ({
          ...res,
          semester: activeFilters.semester,
          tahun_ajaran: activeFilters.tahun_ajaran,
          kelas: activeFilters.kelas,
        }));

        setResults(resultsWithPeriod);
        setStats(statsResponse.data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setError(error.message || "Gagal memuat data clustering");
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (activeFilters.tahun_ajaran && activeFilters.semester && activeFilters.kelas) {
      fetchClusteringData();
    }

    return () => {
      controller.abort();
    };
  }, [clusterFilter, activeFilters, runCounter]);

  // Mengambil data filter (tahun ajaran, semester, kelas) saat komponen dimuat
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [filtersResponse, kelasResponse] = await Promise.all([
          apiService.getNilaiFilters(),
          apiService.getKelasList()
        ]);
        
        const fetchedFilters = filtersResponse.data;
        const fetchedKelas = kelasResponse.data;

        setFilters({ ...fetchedFilters, kelas: fetchedKelas });
        
        const initialTahunAjaran = fetchedFilters.tahun_ajaran[0] || "";
        const initialSemester = fetchedFilters.semester[0] || "";
        const initialKelas = fetchedKelas[0] || "";

        const initialSelected = { tahun_ajaran: initialTahunAjaran, semester: initialSemester, kelas: initialKelas };
        setSelectedFilters(initialSelected);
        setActiveFilters(initialSelected);

      } catch (error: any) {
        setError(error.message || "Gagal memuat opsi filter");
      }
    };
    fetchFilterOptions();
  }, []);


  // Fungsi: jalankan proses clustering baru
  const handleRunClustering = async () => {
    if (!selectedFilters.tahun_ajaran || !selectedFilters.semester || !selectedFilters.kelas) {
      setError("Silakan pilih Tahun Ajaran, Semester, dan Kelas terlebih dahulu.");
      return;
    }
    try {
      setRunning(true)
      setError("")
      await apiService.runClustering({  // mengatur jumlah cluster
        ...selectedFilters,
        algoritma: "k-means", // Hardcoded as requested
      })
      
      setActiveFilters(selectedFilters); setClusterFilter(""); setRunCounter(c => c + 1);

    } catch (error: any) {
      setError(error.message || "Gagal menjalankan clustering")
    } finally {
      setRunning(false)
    }
  }

  const handleClearResults = async () => {
    const { tahun_ajaran, semester, kelas } = selectedFilters;
    if (!tahun_ajaran || !semester || !kelas) {
      setError("Pilih tahun ajaran, semester, dan kelas untuk menghapus hasil.");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus hasil clustering untuk kelas ${kelas}, ${semester} ${tahun_ajaran}?`)) {
      try {
        await apiService.clearClusteringResults(selectedFilters);
        setRunCounter(c => c + 1);
      } catch (error: any) {
        setError(error.message || "Gagal menghapus hasil clustering");
      }
    }
  };

  // Fungsi: export hasil clustering ke file CSV
  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "NIS,Nama,Kelas,Cluster,Keterangan,Jarak Centroid,Algoritma,Jumlah Cluster,Nilai Rata-rata\n" +
      results.map((r: any) => 
        `${r.nis || ""},${r.nama || ""},${r.kelas || ""},${r.cluster},${r.keterangan},${r.jarak_centroid},${r.algoritma},${r.jumlah_cluster},${r.nilai_rata_rata}`
      ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "hasil_clustering.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fungsi: mapping warna badge dengan className custom
  const getBadgeClass = (label: string): string => {
    const lower = label.toLowerCase()
    if (lower.includes("sangat tinggi")) return "bg-blue-500 text-white"
    if (lower.includes("tinggi") && !lower.includes("sangat")) return "bg-green-500 text-white"
    if (lower.includes("sedang")) return "bg-gray-400 text-black"
    if (lower.includes("rendah") && !lower.includes("sangat")) return "bg-red-500 text-white"
    if (lower.includes("sangat rendah")) return "bg-yellow-500 text-black"
    return "bg-gray-200 text-black"
  }

  // Tampilan loading awal
  if (loading && !results.length && !error) {
    return <div>Memuat data halaman...</div>
  }

  return (
    <div className="space-y-6">
      <StudentGradeDetailModal siswa={detailSiswa} onClose={() => setDetailSiswa(null)} />

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clustering Nilai</h1>
          <p className="text-muted-foreground">Analisis pengelompokan nilai siswa berdasarkan performa akademik.</p>
        </div>
        <div className="flex space-x-2">
          {results.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setIsReportModalOpen(true)}><Download className="mr-2 h-4 w-4" />Laporan PDF</Button>
              <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Export</Button>
              <Button variant="destructive" onClick={handleClearResults}><Trash2 className="mr-2 h-4 w-4" />Hapus Hasil</Button>
            </>
          )}
        </div>
      </div>
      <DownloadReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        filters={filters}
        onSubmit={handleDownloadReport}
      />

      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      {/* --- Panel Kontrol Clustering --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5"/>Panel Kontrol Clustering</CardTitle>
          <CardDescription>Pilih sumber data dan jalankan proses clustering.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="grid gap-2">
              <Label htmlFor="tahun_ajaran">Tahun Ajaran</Label>
              <Select
                value={selectedFilters.tahun_ajaran}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, tahun_ajaran: value })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {filters.tahun_ajaran.map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={selectedFilters.semester}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, semester: value })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
                <SelectContent>
                  {filters.semester.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kelas">Kelas</Label>
              <Select
                value={selectedFilters.kelas}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, kelas: value })}
              >
                <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {filters.kelas.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRunClustering} disabled={running} className="w-full md:w-auto">
              {running ? 'Memproses...' : <><Play className="mr-2 h-4 w-4" />Jalankan Clustering</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --- Hasil dan Statistik --- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Panel Informasi Ringkas */}
          {stats && stats.total_results > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Informasi Ringkas</CardTitle>
                <CardDescription>Ringkasan dari hasil clustering periode yang dipilih.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Siswa</p>
                    <p className="text-2xl font-bold">{stats.total_results}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jumlah Cluster</p>
                    <p className="text-2xl font-bold">{stats.clusters_count}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rata-rata Jarak</p>
                    <p className="text-2xl font-bold">{stats.average_distance.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distribusi Siswa per Cluster */}
          {stats && stats.total_results > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Siswa per Cluster</CardTitle>
                <CardDescription>Jumlah dan persentase siswa dalam setiap cluster yang dihasilkan.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cluster</TableHead>
                      <TableHead >Jumlah Siswa</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.cluster_distribution && Array.isArray(stats.cluster_distribution)
                      ? stats.cluster_distribution
                      : Object.entries(stats?.cluster_distribution || {}).map(([label, data]) => ({
                          cluster_id: (data as any).cluster_id, // Assuming cluster_id is available in the object
                          label,
                          count: (data as any).count,
                          percentage: (data as any).percentage,
                        }))
                    )
                      ?.sort((a, b) => {
                        const rank: { [key: string]: number } = {
                          'sangat tinggi': 1,
                          'tinggi': 2,
                          'sedang': 3,
                          'rendah': 4,
                          'sangat rendah': 5,
                        };
                        const rankA = rank[a.label.toLowerCase()] || 99;
                        const rankB = rank[b.label.toLowerCase()] || 99;
                        return rankA - rankB;
                      })
                      .map((entry) => (
                        <TableRow key={`${entry.cluster_id}-${entry.label}`}>                          
                          <TableCell>{entry.cluster_id}</TableCell>
                          <TableCell>{entry.count}</TableCell>
                          <TableCell>{entry.label}</TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          

          {/* Tabel hasil clustering */}
          <Card>
            <CardHeader>
              <CardTitle>Hasil Clustering</CardTitle>
              <CardDescription>
                Detail hasil pengelompokan siswa untuk
                <span className="font-semibold text-primary"> {activeFilters.kelas}, {activeFilters.semester} {activeFilters.tahun_ajaran}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Memuat hasil...</div>
              ) : results.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center space-x-3">
                    <Label htmlFor="filter-cluster" className="text-sm font-medium">Tampilkan Cluster:</Label>
                    <Select
                      value={clusterFilter}
                      onValueChange={(value) => setClusterFilter(value === "all" ? "" : value)}
                    >
                      <SelectTrigger id="filter-cluster" className="w-[250px]">
                        <SelectValue placeholder="Tampilkan Semua" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Cluster ({stats?.total_results || 0} siswa)</SelectItem>
                        {(stats?.cluster_distribution && Array.isArray(stats.cluster_distribution)
                          ? stats.cluster_distribution
                          : Object.entries(stats?.cluster_distribution || {}).map(([label, data]) => ({
                              cluster_id: (data as any).cluster_id,
                              label,
                              count: (data as any).count,
                              percentage: (data as any).percentage,
                            }))
                        ).map((entry) => (
                          <SelectItem key={`${entry.cluster_id}-${entry.label}`} value={entry.label} className="capitalize">
                            {entry.label} ({entry.count} siswa)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NIS</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>ID Cluster</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Jarak</TableHead>
                        <TableHead>Nilai Rata-rata</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.nis || "-"}</TableCell>
                          <TableCell>{result.nama || "-"}</TableCell>
                          <TableCell>{result.kelas || "-"}</TableCell>
                          <TableCell>{`C${result.cluster}`}</TableCell>
                          <TableCell>
                            <Badge className={getBadgeClass(result.keterangan)}>{result.keterangan}</Badge>
                          </TableCell>
                          <TableCell>{Number(result.jarak_centroid).toFixed(4)}</TableCell>
                          <TableCell>{result.nilai_rata_rata}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => setDetailSiswa(result)}>
                              Lihat Selengkapnya
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Hasil Clustering</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Pilih sumber data dan jalankan proses clustering untuk melihat hasilnya di sini.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
