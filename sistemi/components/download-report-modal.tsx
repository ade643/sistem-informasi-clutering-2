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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command"
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"

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
  const [selectedKelas, setSelectedKelas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Pre-fill with the first available option when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTahunAjaran(filters.tahun_ajaran[0] || "");
      setSelectedSemester(filters.semester[0] || "");
      setSelectedKelas([]); // Reset kelas selection
    }
  }, [isOpen, filters]);

  const handleSubmit = async () => {
    if (!selectedTahunAjaran || !selectedSemester || selectedKelas.length === 0) {
      alert("Harap lengkapi semua filter: Tahun Ajaran, Semester, dan Kelas.");
      return;
    }
    setIsSubmitting(true);
    await onSubmit({
      tahun_ajaran: selectedTahunAjaran,
      semester: selectedSemester,
      kelas: selectedKelas,
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
             <div className="col-span-3">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between"
                        >
                        {selectedKelas.length > 0 ? `${selectedKelas.length} kelas dipilih` : "Pilih kelas..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Cari kelas..." />
                            <CommandList>
                            <CommandEmpty>Kelas tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                                {filters.kelas.map((kelas) => (
                                <CommandItem
                                    key={kelas}
                                    value={kelas}
                                    onSelect={() => {
                                        setSelectedKelas(prev => 
                                            prev.includes(kelas) 
                                            ? prev.filter(item => item !== kelas)
                                            : [...prev, kelas]
                                        )
                                        // Keep the popover open for multi-selection
                                        // setPopoverOpen(false) 
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedKelas.includes(kelas) ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {kelas}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
             </div>
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
