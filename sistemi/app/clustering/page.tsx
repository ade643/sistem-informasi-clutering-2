'use client'

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Play, Trash2, Download, Filter } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

interface NilaiItem {
  mapel_id: number
  nama_mapel: string
  nilai: string
}

interface NilaiBySiswa {
  siswa_id: number
  nilai: NilaiItem[]
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
  const [nilaiBySiswa, setNilaiBySiswa] = useState<NilaiBySiswa[]>([])
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
        setNilaiBySiswa([]);
        return;
      }

      setLoading(true);
      try {
        const apiParams = { ...activeFilters, cluster: clusterFilter, all: 'true' };
        const statsParams = { ...activeFilters };

        const [resultsResponse, statsResponse, nilaiResponse] = await Promise.all([
          apiService.getClusteringResults(apiParams, signal),
          apiService.getClusteringStats(statsParams, signal),
          apiService.getNilai({ ...activeFilters, all: 'true' }),
        ]);

        const resultsWithPeriod = resultsResponse.data.map((res: any) => ({
          ...res,
          semester: activeFilters.semester,
          tahun_ajaran: activeFilters.tahun_ajaran,
          kelas: activeFilters.kelas,
        }));

        if (signal.aborted) return;
        setResults(resultsWithPeriod);
        setStats(statsResponse.data);
        setNilaiBySiswa(nilaiResponse.data || []);
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

  const getClusterColor = (label: string): string => {
    const lower = label.toLowerCase()
    if (lower.includes("sangat tinggi")) return "#3b82f6"
    if (lower.includes("tinggi") && !lower.includes("sangat")) return "#22c55e"
    if (lower.includes("sedang")) return "#9ca3af"
    if (lower.includes("rendah") && !lower.includes("sangat")) return "#ef4444"
    if (lower.includes("sangat rendah")) return "#eab308"
    return "#64748b"
  }

  const clusterProfile = useMemo(() => {
    if (!results.length || !nilaiBySiswa.length) {
      return {
        chartData: [],
        series: [] as Array<{ key: string; label: string; clusterLabel: string }>,
        mapelLegend: [] as Array<{ code: string; mapel: string }>,
      }
    }

    const gradeByStudent = new Map<number, NilaiItem[]>()
    for (const entry of nilaiBySiswa) {
      gradeByStudent.set(entry.siswa_id, entry.nilai || [])
    }

    const clusterLabels = new Map<number, string>()
    for (const row of results) {
      if (!clusterLabels.has(row.cluster)) {
        clusterLabels.set(row.cluster, row.keterangan || `C${row.cluster + 1}`)
      }
    }

    const mapelClusterAgg = new Map<string, Record<number, { total: number; count: number }>>()
    for (const row of results) {
      const grades = gradeByStudent.get(row.siswa_id) || []
      for (const grade of grades) {
        const value = Number(grade.nilai)
        if (Number.isNaN(value)) continue

        if (!mapelClusterAgg.has(grade.nama_mapel)) {
          mapelClusterAgg.set(grade.nama_mapel, {})
        }

        const clusterAgg = mapelClusterAgg.get(grade.nama_mapel)!
        if (!clusterAgg[row.cluster]) {
          clusterAgg[row.cluster] = { total: 0, count: 0 }
        }
        clusterAgg[row.cluster].total += value
        clusterAgg[row.cluster].count += 1
      }
    }

    const sortedClusters = Array.from(clusterLabels.keys()).sort((a, b) => a - b)
    const series = sortedClusters.map((clusterId) => ({
      key: `cluster_${clusterId}`,
      label: `Cluster ${clusterId + 1} (${clusterLabels.get(clusterId)})`,
      clusterLabel: clusterLabels.get(clusterId) || "",
    }))

    const mapelEntries = Array.from(mapelClusterAgg.entries())
    const mapelLegend = mapelEntries.map(([mapel], index) => ({
      code: `M${index + 1}`,
      mapel,
    }))
    const codeByMapel = new Map(mapelLegend.map((item) => [item.mapel, item.code]))

    const chartData = mapelEntries.map(([mapel, clusterAgg]) => {
      const row: Record<string, string | number> = {
        mapelCode: codeByMapel.get(mapel) || mapel,
        mapelFull: mapel,
      }
      for (const clusterId of sortedClusters) {
        const agg = clusterAgg[clusterId]
        row[`cluster_${clusterId}`] = agg?.count ? Number((agg.total / agg.count).toFixed(2)) : 0
      }
      return row
    })

    return { chartData, series, mapelLegend }
  }, [results, nilaiBySiswa])

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
                <CardTitle>Perbandingan Profil Kemampuan Siswa per Cluster</CardTitle>
                <CardDescription>Rata-rata nilai per mata pelajaran untuk setiap cluster.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  {/* Bar Chart */}
                  <div className="w-full space-y-3">
                    <div className="h-[300px] w-full">
                    {clusterProfile.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={clusterProfile.chartData}
                          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mapelCode" />
                          <YAxis />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                            labelStyle={{ color: '#f9fafb' }}
                            labelFormatter={(label, payload) => {
                              const fullName = payload?.[0]?.payload?.mapelFull
                              return fullName ? `${label} - ${fullName}` : String(label)
                            }}
                            formatter={(value) => [`${Number(value).toFixed(2)}`, 'Nilai Rata-rata']}
                          />
                          <Legend />
                          {clusterProfile.series.map((entry) => (
                            <Bar
                              key={entry.key}
                              dataKey={entry.key}
                              name={entry.label}
                              fill={getClusterColor(entry.clusterLabel)}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                        Data nilai per mapel belum tersedia untuk ditampilkan.
                      </div>
                    )}
                    </div>
                    {clusterProfile.mapelLegend.length > 0 && (
                      <div className="rounded-md border p-3">
                        <p className="mb-2 text-sm font-medium">Keterangan Kode Mapel</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 text-xs text-muted-foreground">
                          {clusterProfile.mapelLegend.map((item) => (
                            <span key={item.code}>{item.code} = {item.mapel}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Table Distribution */}
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cluster</TableHead>
                          <TableHead >Jumlah Siswa</TableHead>
                          <TableHead>%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(stats?.cluster_distribution && Array.isArray(stats.cluster_distribution)
                          ? stats.cluster_distribution
                          : Object.entries(stats?.cluster_distribution || {}).map(([label, data]) => ({
                              cluster_id: (data as any).cluster_id,
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
                              <TableCell>{entry.label}</TableCell>
                              <TableCell>{entry.count}</TableCell>
                              <TableCell>{entry.percentage}</TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
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
