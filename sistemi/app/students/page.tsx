"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"  
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react"
import apiService from "@/lib/api"
import { StudentsLoading } from "@/components/students-loading"
import { ToastContainer } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { debounce } from "lodash"

interface Siswa {
  id: number
  nis: string
  nama: string
  kelas: string
  created_at: string
  updated_at: string
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Siswa[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 10,
  })
  const [formData, setFormData] = useState({
    nis: "",
    nama: "",
    kelas: "",
  })
  const { toasts, addToast, removeToast } = useToast()


  const fetchStudents = useCallback(async (page = 1, search = "") => {
    try {
      setLoading(true)
      setError("")
      
      const params = {
        page: page.toString(),
        limit: pagination.items_per_page.toString(),
        search: search,
      }
      const response = await apiService.getSiswa(params)
      setStudents(response.data)
      if (response.pagination) {
        setPagination(response.pagination)
      }
    } catch (error: any) {
      const errorMessage = error.message || "Gagal memuat data siswa"
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [pagination.items_per_page, addToast])

  useEffect(() => {
    fetchStudents(1, searchTerm)
  }, [fetchStudents, searchTerm])

  const debouncedFetchStudents = useCallback(debounce(fetchStudents, 300), [fetchStudents])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handlePageChange = (page: number) => {
    fetchStudents(page, searchTerm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingStudent) {
        await apiService.updateSiswa(editingStudent.id, formData)
        addToast('Data siswa berhasil diperbarui', 'success')
      } else {
        await apiService.createSiswa(formData)
        addToast('Data siswa berhasil ditambahkan', 'success')
      }
      
      setIsDialogOpen(false)
      setEditingStudent(null)
      resetForm()
      fetchStudents(pagination.current_page, searchTerm)
    } catch (error: any) {
      const errorMessage = error.message || "Gagal menyimpan data siswa"
      setError(errorMessage)
      addToast(errorMessage, 'error')
    }
  }

  const handleEdit = (student: Siswa) => {
    setEditingStudent(student)
    setFormData({
      nis: student.nis,
      nama: student.nama,
      kelas: student.kelas,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus siswa ini?")) {
      try {
        await apiService.deleteSiswa(id)
        addToast('Data siswa berhasil dihapus', 'success')
        fetchStudents(pagination.current_page, searchTerm)
      } catch (error: any) {
        const errorMessage = error.message || "Gagal menghapus siswa"
        setError(errorMessage)
        addToast(errorMessage, 'error')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      nis: "",
      nama: "",
      kelas: "",
    })
  }

  const handleExport = async () => {
    try {
      const response = await apiService.getSiswa({ all: 'true' });
      const allStudents = response.data;

      const csvContent =
        "data:text/csv;charset=utf-8," +
        "NIS,Nama,Kelas\n" +
        allStudents.map((s: Siswa) => `${s.nis},${s.nama},${s.kelas}`).join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", "data_siswa.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      addToast('Data siswa berhasil diexport', 'success')
    } catch (error) {
      addToast('Gagal mengexport data siswa', 'error')
    }
  }

  if (loading) {
    return (
      <>
        <StudentsLoading />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Siswa</h1>
            <p className="text-muted-foreground">Kelola data siswa sekolah</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingStudent(null)
                    resetForm()
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Siswa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Edit Siswa" : "Tambah Siswa Baru"}</DialogTitle>
                  <DialogDescription>
                    {editingStudent ? "Ubah informasi siswa" : "Masukkan informasi siswa baru"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="nis">NIS</Label>
                        <Input
                          id="nis"
                          value={formData.nis}
                          onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="nama">Nama Lengkap</Label>
                        <Input
                          id="nama"
                          value={formData.nama}
                          onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                          required
                        />
                      </div>
                      
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="kelas">Kelas</Label>
                        <Input
                          id="kelas"
                          value={formData.kelas}
                          onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                          placeholder="Masukkan kelas (contoh: VII-A)"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingStudent ? "Simpan Perubahan" : "Tambah Siswa"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daftar Siswa</CardTitle>
            <CardDescription>
              Total {pagination.total_items} siswa terdaftar
              {pagination.total_pages > 1 && (
                <span className="ml-2 text-sm text-gray-500">
                  (Halaman {pagination.current_page} dari {pagination.total_pages})
                </span>
              )}
            </CardDescription>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari siswa..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.nis}</TableCell>
                      <TableCell>{student.nama}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.kelas}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {searchTerm ? "Tidak ada siswa yang ditemukan" : "Belum ada data siswa"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Menampilkan {((pagination.current_page - 1) * pagination.items_per_page) + 1} - {Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items)} dari {pagination.total_items} siswa
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={pagination.current_page === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.total_pages}
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}