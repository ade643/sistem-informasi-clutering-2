# Backend API - Sistem Informasi Clustering Nilai Siswa

Backend API untuk sistem informasi clustering nilai siswa yang dibangun dengan Node.js, Express, dan MySQL.

## Fitur Utama

- **Autentikasi & Otorisasi**: JWT-based authentication dengan role-based access control
- **Manajemen Siswa**: CRUD operasi untuk data siswa
- **Manajemen Nilai**: CRUD operasi untuk data nilai siswa
- **Clustering**: Implementasi algoritma K-Means untuk clustering nilai
- **Dashboard**: Statistik dan analisis data
- **Manajemen User**: CRUD operasi untuk pengguna sistem

## Teknologi yang Digunakan

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi database**
   - Buat database MySQL dengan nama `ta`
   - Update konfigurasi di `config/database.js` atau buat file `.env`

4. **Setup environment variables**
   Buat file `.env` dengan konfigurasi berikut:
   ```env
   APP_PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_NAME=ta
   DB_USER=root
   DB_PASSWORD=
   JWT_SECRET=your-super-secret-jwt-key
   ```

5. **Jalankan server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Struktur Database

### Tabel Users
- `id` (Primary Key)
- `nama` (String)
- `email` (String, Unique)
- `password` (String, Hashed)
- `role` (Enum: 'admin', 'teacher')
- `status` (Enum: 'active', 'inactive')
- `last_login` (DateTime)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Tabel Siswa
- `id` (Primary Key)
- `nis` (String, Unique)
- `nama` (String)
- `kelas` (String)
- `jenis_kelamin` (Enum: 'L', 'P')
- `tanggal_lahir` (Date)
- `alamat` (Text)
- `telepon` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Tabel Nilai_Siswa
- `id` (Primary Key)
- `siswa_id` (Foreign Key)
- `semester` (String)
- `matematika` (Decimal)
- `fisika` (Decimal)
- `kimia` (Decimal)
- `biologi` (Decimal)
- `bahasa_indonesia` (Decimal)
- `bahasa_inggris` (Decimal)
- `geografi` (Decimal)
- `sejarah` (Decimal)
- `ekonomi` (Decimal)
- `rata_rata` (Decimal)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Tabel Hasil_Cluster
- `id` (Primary Key)
- `siswa_id` (Foreign Key)
- `cluster` (Integer)
- `keterangan` (String)
- `jarak_centroid` (Decimal)
- `algoritma` (String)
- `jumlah_cluster` (Integer)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Siswa Management
- `GET /api/siswa` - Get all siswa (with pagination & search)
- `GET /api/siswa/:id` - Get siswa by ID
- `POST /api/siswa` - Create new siswa
- `PUT /api/siswa/:id` - Update siswa
- `DELETE /api/siswa/:id` - Delete siswa
- `GET /api/siswa/stats` - Get siswa statistics

### Nilai Management
- `GET /api/nilai` - Get all nilai (with pagination & search)
- `GET /api/nilai/:id` - Get nilai by ID
- `POST /api/nilai` - Create new nilai
- `PUT /api/nilai/:id` - Update nilai
- `DELETE /api/nilai/:id` - Delete nilai
- `GET /api/nilai/stats` - Get nilai statistics

### Clustering
- `POST /api/clustering/run` - Run clustering algorithm
- `GET /api/clustering/results` - Get clustering results
- `GET /api/clustering/stats` - Get clustering statistics
- `DELETE /api/clustering/clear` - Clear clustering results

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/password` - Change user password
- `GET /api/users/stats` - Get user statistics

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/charts` - Get chart data
- `GET /api/dashboard/quick-stats` - Get quick statistics

## Authentication

API menggunakan JWT (JSON Web Token) untuk autentikasi. Setelah login berhasil, token harus disertakan di header Authorization:

```
Authorization: Bearer <token>
```

## Role-Based Access Control

- **Admin**: Akses penuh ke semua fitur
- **Teacher**: Akses ke manajemen siswa, nilai, dan clustering
- **Public**: Hanya endpoint login dan register

## Response Format

Semua response mengikuti format standar:

```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": {
    // Data response
  },
  "pagination": {
    // Info pagination (jika ada)
  }
}
```

## Error Handling

Error response format:

```json
{
  "success": false,
  "message": "Pesan error",
  "error": "Detail error (development only)"
}
```

## Clustering Algorithm

Sistem menggunakan algoritma K-Means untuk clustering nilai siswa:

1. **Input**: Data nilai rata-rata siswa
2. **Process**: 
   - Inisialisasi centroid secara random
   - Assign setiap data point ke centroid terdekat
   - Recalculate centroid berdasarkan rata-rata cluster
   - Ulangi sampai konvergen
3. **Output**: 
   - Cluster labels (Tinggi, Sedang, Rendah)
   - Jarak ke centroid
   - Statistik cluster

## Development

### Scripts
- `npm run dev` - Jalankan server dengan nodemon
- `npm start` - Jalankan server production
- `npm test` - Jalankan tests

### Logging
Server menggunakan console.log untuk logging. Untuk production, disarankan menggunakan library logging seperti Winston.

### Security
- Password di-hash menggunakan bcryptjs
- JWT token dengan expiration time
- CORS configuration
- Input validation
- SQL injection protection (Sequelize)

## Deployment

1. Set environment variables untuk production
2. Install dependencies: `npm install --production`
3. Build aplikasi (jika diperlukan)
4. Jalankan dengan PM2 atau process manager lainnya

## Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## License

MIT License 