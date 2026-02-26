"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface for available filter options
interface FilterOptions {
  tahun_ajaran: string[];
  semester: string[];
  kelas: string[];
}

// Interface for the props of the modal
interface DownloadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onSubmit: (selectedFilters: {
    tahun_ajaran: string;
    semester: string;
    kelas: string[];
  }) => Promise<void>;
}

export function DownloadReportModal({
  isOpen,
  onClose,
  filters,
  onSubmit,
}: DownloadReportModalProps) {
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill with the first available option when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTahunAjaran(filters.tahun_ajaran[0] || "");
      setSelectedSemester(filters.semester[0] || "");
      setSelectedKelas(filters.kelas[0] || "");
    }
  }, [isOpen, filters]);

  const handleSubmit = async () => {
    if (!selectedTahunAjaran || !selectedSemester || !selectedKelas) {
      alert("Harap lengkapi semua filter: Tahun Ajaran, Semester, dan Kelas.");
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      tahun_ajaran: selectedTahunAjaran,
      semester: selectedSemester,
      kelas: [selectedKelas],
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unduh Laporan Clustering</DialogTitle>
          <DialogDescription>
            Pilih kriteria data untuk disertakan dalam laporan PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tahun-ajaran-modal" className="text-right">
              Tahun Ajaran
            </Label>
            <Select
              value={selectedTahunAjaran}
              onValueChange={setSelectedTahunAjaran}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih tahun ajaran" />
              </SelectTrigger>
              <SelectContent>
                {filters.tahun_ajaran.map((ta) => (
                  <SelectItem key={ta} value={ta}>
                    {ta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="semester-modal" className="text-right">
              Semester
            </Label>
            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih semester" />
              </SelectTrigger>
              <SelectContent>
                {filters.semester.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="kelas-modal" className="text-right">
                Kelas
             </Label>
             <Select value={selectedKelas} onValueChange={setSelectedKelas}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                {filters.kelas.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
             </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Membuat Laporan..." : "Buat dan Unduh PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
