"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, GraduationCap, FileText, BarChart3, TrendingUp, Award, AlertCircle, Filter } from "lucide-react"
import apiService from "@/lib/api"
import { Button } from "@/components/ui/button"
import { DashboardLoading } from "@/components/dashboard-loading"
import { ToastContainer } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  active_period: { semester: string | null; tahun_ajaran: string | null };
  stats: {
    total_siswa: number; total_nilai: number; total_users: number; total_clustering: number;
    rata_rata_nilai: string; siswa_berprestasi: number; perlu_perhatian: number;
  };
  cluster_distribution: {
    tinggi: { count: number; percentage: string };
    sedang: { count: number; percentage: string };
    rendah: { count: number; percentage: string };
  };
}

interface FilterOptions {
  semester: string[];
  tahun_ajaran: string[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({ semester: [], tahun_ajaran: [] })
  const [selectedPeriod, setSelectedPeriod] = useState({ semester: "", tahun_ajaran: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toasts, addToast, removeToast } = useToast()

  const fetchDashboardData = useCallback(async (period?: { semester: string; tahun_ajaran: string }) => {
    setLoading(true)
    setError("")
    try {
      const [filtersRes, statsRes] = await Promise.all([
        apiService.getDashboardFilters(),
        apiService.getDashboardStats(period)
      ]);

      if (filtersRes.success) setFilters(filtersRes.data)
      
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
        if (statsRes.data.active_period) {
          setSelectedPeriod({
            semester: statsRes.data.active_period.semester || "",
            tahun_ajaran: statsRes.data.active_period.tahun_ajaran || "",
          })
        }
        addToast('Data dashboard berhasil dimuat', 'success')
      } else {
        throw new Error(statsRes.message || 'Gagal memuat data dashboard')
      }
    } catch (error: any) {
      setError(error.message || "Terjadi kesalahan tidak diketahui")
      addToast(error.message || "Gagal memuat data", 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  const handleApplyFilter = () => { fetchDashboardData(selectedPeriod) }

  if (loading && !stats) return <DashboardLoading />
  if (error && !stats) return <div className="text-red-500 p-4">Error: {error} <Button onClick={() => fetchDashboardData()}>Coba Lagi</Button></div>

  const statsCards = stats ? [
    { name: "Total Pengguna", value: stats.stats.total_users.toString(), icon: Users, note: "Total dalam sistem" },
    { name: "Total Siswa", value: stats.stats.total_siswa.toString(), icon: GraduationCap, note: "Total dalam sistem" },
    { name: "Data Nilai (Periode)", value: stats.stats.total_nilai.toString(), icon: FileText, note: "Sesuai periode terpilih" },
    { name: "Cluster (Periode)", value: stats.stats.total_clustering.toString(), icon: BarChart3, note: "Sesuai periode terpilih" },
  ] : []

  return (
    <>
      <div className={`space-y-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di Sistem Informasi Clustering Nilai Siswa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Periode</CardTitle>
            <CardDescription>
                {stats?.active_period?.semester && stats?.active_period?.tahun_ajaran
                  ? <>Menampilkan data untuk periode: <span className="font-semibold text-blue-600">Semester {stats.active_period.semester} T.A. {stats.active_period.tahun_ajaran}</span></>
                  : "Pilih periode untuk menampilkan data."
                }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1"><label className="text-sm font-medium">Semester</label><Select value={selectedPeriod.semester} onValueChange={(v) => setSelectedPeriod(p => ({ ...p, semester: v }))}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{filters.semester.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex-1"><label className="text-sm font-medium">Tahun Ajaran</label><Select value={selectedPeriod.tahun_ajaran} onValueChange={(v) => setSelectedPeriod(p => ({ ...p, tahun_ajaran: v }))}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{filters.tahun_ajaran.map(ta => <SelectItem key={ta} value={ta}>{ta}</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleApplyFilter} disabled={loading}><Filter className="mr-2 h-4 w-4" />Terapkan Periode</Button>
          </CardContent>
        </Card>

        {!stats ? <div className="text-center py-10"><p>Tidak ada data untuk ditampilkan.</p></div> : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statsCards.map((stat) => (
                <Card key={stat.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Distribusi Cluster (Periode)</CardTitle>
                  <CardDescription>Sebaran siswa berdasarkan hasil clustering pada periode terpilih.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="space-y-4">
                    {Object.entries(stats.cluster_distribution).map(([key, value]) => {
                        const colors = { tinggi: 'bg-green-500', sedang: 'bg-yellow-500', rendah: 'bg-red-500' };
                        return (
                            <div key={key} className="flex items-center">
                                <div className={`w-4 h-4 ${colors[key as keyof typeof colors]} rounded mr-3`}></div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium capitalize">Cluster {key}</span>
                                        <span className="text-sm text-muted-foreground">{value.count} siswa</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div className={`${colors[key as keyof typeof colors]} h-2 rounded-full`} style={{ width: `${value.percentage}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Statistik Nilai (Periode)</CardTitle>
                  <CardDescription>Rangkuman nilai untuk periode yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2"><span className="text-sm font-medium">Rata-rata Nilai</span><span className="text-lg font-bold">{stats.stats.rata_rata_nilai}</span></div>
                    <div className="flex items-center justify-between border-b pb-2"><span className="text-sm font-medium">Siswa Berprestasi (≥80)</span><span className="text-lg font-bold">{stats.stats.siswa_berprestasi}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-medium">Perlu Perhatian ({"<"}60)</span><span className="text-lg font-bold">{stats.stats.perlu_perhatian}</span></div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
