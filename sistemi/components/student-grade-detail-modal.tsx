'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import apiService from '@/lib/api'

// Define the structure for a single grade
interface Grade {
  mapel: string
  nilai: number
}

// Define the structure for the student data passed as a prop
interface SiswaDetail {
  siswa_id: number
  nama?: string
  nis?: string
  kelas?: string
  keterangan: string
  semester: string
  tahun_ajaran: string
}

interface Props {
  siswa: SiswaDetail | null
  onClose: () => void
}

// Helper to determine grade bar color
const getGradeColor = (nilai: number) => {
  if (nilai >= 90) return 'bg-blue-500'
  if (nilai >= 80) return 'bg-green-500'
  if (nilai >= 70) return 'bg-yellow-500'
  if (nilai >= 60) return 'bg-orange-500'
  return 'bg-red-500'
}

export function StudentGradeDetailModal({ siswa, onClose }: Props) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (siswa) {
      const fetchGrades = async () => {
        setLoading(true)
        setError('')
        try {
          const response = await apiService.getNilaiBySiswaId(siswa.siswa_id, {
            semester: siswa.semester,
            tahun_ajaran: siswa.tahun_ajaran,
          })
          setGrades(response.data)
        } catch (err: any) {
          setError(err.message || 'Gagal memuat detail nilai.')
        } finally {
          setLoading(false)
        }
      }
      fetchGrades()
    }
  }, [siswa])

  const isOpen = !!siswa

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detail Nilai: {siswa?.nama || 'Siswa'}</DialogTitle>
          <DialogDescription>
            Berikut adalah rincian nilai per mata pelajaran untuk periode {siswa?.semester} {siswa?.tahun_ajaran}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-muted-foreground">NIS: {siswa?.nis || '-'}</p>
              <p className="text-sm text-muted-foreground">Kelas: {siswa?.kelas || '-'}</p>
            </div>
            <Badge>{siswa?.keterangan}</Badge>
          </div>

          {loading && <p>Memuat nilai...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="space-y-3 pr-4">
              {grades.map((grade, index) => (
                <div key={index} className="grid grid-cols-3 items-center gap-4">
                  <span className="font-medium truncate col-span-1">{grade.mapel}</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${getGradeColor(grade.nilai)}`}
                        style={{ width: `${grade.nilai}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-sm w-12 text-right">{grade.nilai.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
