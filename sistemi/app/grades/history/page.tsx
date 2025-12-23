'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import apiService from '@/lib/api';

interface UploadHistoryEntry {
  id: number;
  nama_file: string;
  kelas: string;
  semester: string;
  tahun_ajaran: string;
  tanggal_upload: string; // ISO string
}

export default function UploadHistoryPage() {
  const [history, setHistory] = useState<UploadHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNilaiUploadHistory();
      setHistory(response.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat unggahan.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Memuat riwayat unggahan...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Unggahan Nilai</h1>
          <p className="text-muted-foreground">Daftar file Excel yang pernah diunggah.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar File Unggahan</CardTitle>
          <CardDescription>Menampilkan semua file nilai yang berhasil diunggah ke sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground">Belum ada riwayat unggahan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama File</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>Tanggal Unggah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.nama_file}</TableCell>
                    <TableCell>{entry.kelas}</TableCell>
                    <TableCell>{entry.semester}</TableCell>
                    <TableCell>{entry.tahun_ajaran}</TableCell>
                    <TableCell>{new Date(entry.tanggal_upload).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}