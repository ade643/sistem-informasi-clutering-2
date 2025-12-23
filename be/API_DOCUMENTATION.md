# API Documentation - Sistem Informasi Clustering Nilai Siswa

## Base URL
```
http://localhost:5000/api
```

## Authentication
Semua endpoint (kecuali login dan register) memerlukan token JWT di header Authorization:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### POST /auth/login
Login user dan mendapatkan token JWT.

**Request Body:**
```json
{
  "email": "admin@sekolah.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nama": "Administrator",
      "email": "admin@sekolah.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### POST /auth/register
Register user baru.

**Request Body:**
```json
{
  "nama": "Guru Baru",
  "email": "guru.baru@sekolah.com",
  "password": "password123",
  "role": "teacher"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User berhasil dibuat",
  "data": {
    "id": 3,
    "nama": "Guru Baru",
    "email": "guru.baru@sekolah.com",
    "role": "teacher",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /auth/profile
Mendapatkan profil user yang sedang login.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama": "Administrator",
    "email": "admin@sekolah.com",
    "role": "admin",
    "status": "active",
    "last_login": "2024-01-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /auth/change-password
Mengubah password user yang sedang login.

**Request Body:**
```json
{
  "currentPassword": "admin123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password berhasil diubah"
}
```

---

## 2. Siswa Management Endpoints

### GET /siswa
Mendapatkan daftar siswa dengan pagination dan search.

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10)
- `search` (optional): Kata kunci pencarian

**Example:**
```
GET /siswa?page=1&limit=5&search=ahmad
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nis": "2024001",
      "nama": "Ahmad Rizki",
      "kelas": "XII IPA 1",
      "jenis_kelamin": "L",
      "tanggal_lahir": "2006-05-15",
      "alamat": "Jl. Merdeka No. 123, Jakarta",
      "telepon": "081234567890",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 5,
    "items_per_page": 5
  }
}
```

### GET /siswa/:id
Mendapatkan detail siswa berdasarkan ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nis": "2024001",
    "nama": "Ahmad Rizki",
    "kelas": "XII IPA 1",
    "jenis_kelamin": "L",
    "tanggal_lahir": "2006-05-15",
    "alamat": "Jl. Merdeka No. 123, Jakarta",
    "telepon": "081234567890",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /siswa
Membuat siswa baru.

**Request Body:**
```json
{
  "nis": "2024006",
  "nama": "Anisa Putri",
  "kelas": "XII IPA 1",
  "jenis_kelamin": "P",
  "tanggal_lahir": "2006-09-15",
  "alamat": "Jl. Kebayoran Baru No. 123, Jakarta",
  "telepon": "081234567895"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Siswa berhasil ditambahkan",
  "data": {
    "id": 6,
    "nis": "2024006",
    "nama": "Anisa Putri",
    "kelas": "XII IPA 1",
    "jenis_kelamin": "P",
    "tanggal_lahir": "2006-09-15",
    "alamat": "Jl. Kebayoran Baru No. 123, Jakarta",
    "telepon": "081234567895",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /siswa/:id
Mengupdate data siswa.

**Request Body:**
```json
{
  "nama": "Ahmad Rizki Updated",
  "alamat": "Jl. Merdeka No. 123 Updated, Jakarta"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Siswa berhasil diperbarui",
  "data": {
    "id": 1,
    "nis": "2024001",
    "nama": "Ahmad Rizki Updated",
    "kelas": "XII IPA 1",
    "jenis_kelamin": "L",
    "tanggal_lahir": "2006-05-15",
    "alamat": "Jl. Merdeka No. 123 Updated, Jakarta",
    "telepon": "081234567890",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### DELETE /siswa/:id
Menghapus siswa.

**Response:**
```json
{
  "success": true,
  "message": "Siswa berhasil dihapus"
}
```

### GET /siswa/stats
Mendapatkan statistik siswa.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_siswa": 5,
    "by_kelas": [
      {
        "kelas": "XII IPA 1",
        "jumlah": 2
      },
      {
        "kelas": "XII IPS 1",
        "jumlah": 1
      }
    ],
    "by_gender": [
      {
        "jenis_kelamin": "L",
        "jumlah": 3
      },
      {
        "jenis_kelamin": "P",
        "jumlah": 2
      }
    ]
  }
}
```

---

## 3. Nilai Management Endpoints

### GET /nilai
Mendapatkan daftar nilai dengan pagination dan search.

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10)
- `search` (optional): Kata kunci pencarian (nama siswa)
- `semester` (optional): Filter berdasarkan semester

**Example:**
```
GET /nilai?page=1&limit=5&search=ahmad&semester=Ganjil 2024
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "siswa_id": 1,
      "semester": "Ganjil 2024",
      "matematika": 85.00,
      "fisika": 78.00,
      "kimia": 82.00,
      "biologi": 88.00,
      "bahasa_indonesia": 80.00,
      "bahasa_inggris": 75.00,
      "geografi": null,
      "sejarah": null,
      "ekonomi": null,
      "rata_rata": 81.30,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "Siswa": {
        "id": 1,
        "nis": "2024001",
        "nama": "Ahmad Rizki",
        "kelas": "XII IPA 1"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 5,
    "items_per_page": 5
  }
}
```

### GET /nilai/:id
Mendapatkan detail nilai berdasarkan ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "siswa_id": 1,
    "semester": "Ganjil 2024",
    "matematika": 85.00,
    "fisika": 78.00,
    "kimia": 82.00,
    "biologi": 88.00,
    "bahasa_indonesia": 80.00,
    "bahasa_inggris": 75.00,
    "geografi": null,
    "sejarah": null,
    "ekonomi": null,
    "rata_rata": 81.30,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "Siswa": {
      "id": 1,
      "nis": "2024001",
      "nama": "Ahmad Rizki",
      "kelas": "XII IPA 1",
      "jenis_kelamin": "L"
    }
  }
}
```

### POST /nilai
Membuat data nilai baru.

**Request Body:**
```json
{
  "siswa_id": 1,
  "semester": "Genap 2024",
  "matematika": 88,
  "fisika": 85,
  "kimia": 87,
  "biologi": 90,
  "bahasa_indonesia": 85,
  "bahasa_inggris": 82
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data nilai berhasil ditambahkan",
  "data": {
    "id": 6,
    "siswa_id": 1,
    "semester": "Genap 2024",
    "matematika": 88.00,
    "fisika": 85.00,
    "kimia": 87.00,
    "biologi": 90.00,
    "bahasa_indonesia": 85.00,
    "bahasa_inggris": 82.00,
    "geografi": null,
    "sejarah": null,
    "ekonomi": null,
    "rata_rata": 86.33,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /nilai/:id
Mengupdate data nilai.

**Request Body:**
```json
{
  "matematika": 90,
  "fisika": 88
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data nilai berhasil diperbarui",
  "data": {
    "id": 1,
    "siswa_id": 1,
    "semester": "Ganjil 2024",
    "matematika": 90.00,
    "fisika": 88.00,
    "kimia": 82.00,
    "biologi": 88.00,
    "bahasa_indonesia": 80.00,
    "bahasa_inggris": 75.00,
    "geografi": null,
    "sejarah": null,
    "ekonomi": null,
    "rata_rata": 83.83,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### DELETE /nilai/:id
Menghapus data nilai.

**Response:**
```json
{
  "success": true,
  "message": "Data nilai berhasil dihapus"
}
```

### GET /nilai/stats
Mendapatkan statistik nilai.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_nilai": 5,
    "rata_rata_keseluruhan": "80.52",
    "by_semester": [
      {
        "semester": "Ganjil 2024",
        "jumlah": 5,
        "rata_rata": 80.52
      }
    ],
    "by_kelas": [
      {
        "rata_rata": 85.90,
        "jumlah": 2,
        "Siswa": {
          "kelas": "XII IPA 1"
        }
      }
    ]
  }
}
```

---

## 4. Clustering Endpoints

### POST /clustering/run
Menjalankan algoritma clustering.

**Request Body:**
```json
{
  "algoritma": "kmeans",
  "jumlah_cluster": 3,
  "semester": "Ganjil 2024"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Clustering berhasil dijalankan",
  "data": {
    "results": [
      {
        "id": 1,
        "siswa_id": 1,
        "nis": "2024001",
        "nama": "Ahmad Rizki",
        "kelas": "XII IPA 1",
        "rata_rata": 81.3,
        "cluster": 2,
        "keterangan": "Sedang",
        "jarak_centroid": 0.23
      }
    ],
    "statistics": {
      "total_siswa": 5,
      "jumlah_cluster": 3,
      "algoritma": "kmeans",
      "cluster_stats": {
        "tinggi": {
          "count": 2,
          "percentage": "40.0",
          "avg_rata_rata": "88.35"
        },
        "sedang": {
          "count": 2,
          "percentage": "40.0",
          "avg_rata_rata": "78.05"
        },
        "rendah": {
          "count": 1,
          "percentage": "20.0",
          "avg_rata_rata": "69.70"
        }
      },
      "centroids": ["69.70", "78.05", "88.35"]
    }
  }
}
```

### GET /clustering/results
Mendapatkan hasil clustering.

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10)
- `cluster` (optional): Filter berdasarkan cluster

**Example:**
```
GET /clustering/results?cluster=Tinggi&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "siswa_id": 1,
      "nis": "2024001",
      "nama": "Ahmad Rizki",
      "kelas": "XII IPA 1",
      "cluster": 2,
      "keterangan": "Sedang",
      "jarak_centroid": 0.23,
      "algoritma": "kmeans",
      "jumlah_cluster": 3
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 5,
    "items_per_page": 10
  }
}
```

### GET /clustering/stats
Mendapatkan statistik clustering.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_results": 5,
    "cluster_stats": {
      "tinggi": {
        "count": 2,
        "percentage": "40.0"
      },
      "sedang": {
        "count": 2,
        "percentage": "40.0"
      },
      "rendah": {
        "count": 1,
        "percentage": "20.0"
      }
    },
    "latest_clustering": {
      "algoritma": "kmeans",
      "jumlah_cluster": 3,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### DELETE /clustering/clear
Menghapus semua hasil clustering.

**Response:**
```json
{
  "success": true,
  "message": "Hasil clustering berhasil dihapus"
}
```

---

## 5. User Management Endpoints (Admin Only)

### GET /users
Mendapatkan daftar user.

**Query Parameters:**
- `page` (optional): Halaman (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10)
- `search` (optional): Kata kunci pencarian
- `role` (optional): Filter berdasarkan role

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama": "Administrator",
      "email": "admin@sekolah.com",
      "role": "admin",
      "status": "active",
      "last_login": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 2,
    "items_per_page": 10
  }
}
```

### GET /users/:id
Mendapatkan detail user berdasarkan ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama": "Administrator",
    "email": "admin@sekolah.com",
    "role": "admin",
    "status": "active",
    "last_login": "2024-01-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /users
Membuat user baru.

**Request Body:**
```json
{
  "nama": "Guru Bahasa",
  "email": "guru.bahasa@sekolah.com",
  "password": "password123",
  "role": "teacher",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User berhasil dibuat",
  "data": {
    "id": 3,
    "nama": "Guru Bahasa",
    "email": "guru.bahasa@sekolah.com",
    "role": "teacher",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /users/:id
Mengupdate user.

**Request Body:**
```json
{
  "nama": "Guru Bahasa Updated",
  "status": "inactive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User berhasil diperbarui",
  "data": {
    "id": 3,
    "nama": "Guru Bahasa Updated",
    "email": "guru.bahasa@sekolah.com",
    "role": "teacher",
    "status": "inactive",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /users/:id/password
Mengubah password user.

**Request Body:**
```json
{
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password user berhasil diubah"
}
```

### DELETE /users/:id
Menghapus user.

**Response:**
```json
{
  "success": true,
  "message": "User berhasil dihapus"
}
```

### GET /users/stats
Mendapatkan statistik user.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 2,
    "active_users": 2,
    "by_role": [
      {
        "role": "admin",
        "jumlah": 1
      },
      {
        "role": "teacher",
        "jumlah": 1
      }
    ],
    "by_status": [
      {
        "status": "active",
        "jumlah": 2
      }
    ]
  }
}
```

---

## 6. Dashboard Endpoints

### GET /dashboard/stats
Mendapatkan statistik dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_siswa": 5,
      "total_nilai": 5,
      "total_users": 2,
      "total_clustering": 5,
      "rata_rata_nilai": "80.52",
      "siswa_berprestasi": 2,
      "perlu_perhatian": 1
    },
    "changes": {
      "siswa": "+15",
      "nilai": "+89",
      "clustering": "0",
      "users": "+2"
    },
    "cluster_distribution": {
      "tinggi": {
        "count": 2,
        "percentage": "40.0"
      },
      "sedang": {
        "count": 2,
        "percentage": "40.0"
      },
      "rendah": {
        "count": 1,
        "percentage": "20.0"
      }
    }
  }
}
```

### GET /dashboard/charts
Mendapatkan data untuk chart.

**Response:**
```json
{
  "success": true,
  "data": {
    "nilai_distribution": [
      {
        "range": "0-59",
        "count": 0
      },
      {
        "range": "60-69",
        "count": 1
      },
      {
        "range": "70-79",
        "count": 1
      },
      {
        "range": "80-89",
        "count": 2
      },
      {
        "range": "90-100",
        "count": 1
      }
    ],
    "nilai_by_kelas": [
      {
        "rata_rata": 85.90,
        "jumlah": 2,
        "Siswa": {
          "kelas": "XII IPA 1"
        }
      }
    ]
  }
}
```

### GET /dashboard/quick-stats
Mendapatkan statistik cepat.

**Response:**
```json
{
  "success": true,
  "data": {
    "today_stats": {
      "siswa_baru": 0,
      "nilai_baru": 0,
      "clustering_baru": 0
    },
    "top_students": [
      {
        "rata_rata": 90.50,
        "Siswa": {
          "nama": "Siti Nurhaliza",
          "nis": "2024002",
          "kelas": "XII IPA 1"
        }
      }
    ],
    "recent_nilai": [
      {
        "rata_rata": 81.30,
        "semester": "Ganjil 2024",
        "created_at": "2024-01-15T10:30:00.000Z",
        "Siswa": {
          "nama": "Ahmad Rizki",
          "nis": "2024001",
          "kelas": "XII IPA 1"
        }
      }
    ]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email dan password harus diisi"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Token tidak ditemukan"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Akses ditolak. Hanya admin yang diizinkan"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Siswa tidak ditemukan"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Terjadi kesalahan server",
  "error": "Detail error (development only)"
}
```

---

## Testing

Gunakan file `test-api.http` untuk testing semua endpoint dengan REST Client extension di VS Code atau aplikasi seperti Postman.

### Default Credentials
- **Admin**: admin@sekolah.com / admin123
- **Teacher**: guru.math@sekolah.com / teacher123
