import bcrypt from 'bcryptjs';
import User from '../model/userModel.js';
import Siswa from '../model/siswaModel.js';
import MataPelajaran from '../model/mapelModel.js';
import Nilai from '../model/nilaiModel.js';
import { pathToFileURL } from 'url';

export const seedInitialData = async () => {
  try {
    console.log('Starting to seed initial data...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      nama: 'Administrator',
      email: 'admin@sekolah.com',
      password: adminPassword,
      role: 'admin',
      status: 'active'
    });
    console.log('Admin user created:', adminUser.email);

    // Create teacher user
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacherUser = await User.create({
      nama: 'Guru Matematika',
      email: 'guru.math@sekolah.com',
      password: teacherPassword,
      role: 'teacher',
      status: 'active'
    });
    console.log('Teacher user created:', teacherUser.email);

    // // Create sample students
    // const sampleStudents = [
    //   {
    //     nis: '2024001',
    //     nama: 'Ahmad Rizki',
    //     kelas: 'XII IPA 1',
    //     jenis_kelamin: 'L',
    //     tanggal_lahir: '2006-05-15',
    //     alamat: 'Jl. Merdeka No. 123, Jakarta',
    //     telepon: '081234567890'
    //   },
    //   {
    //     nis: '2024002',
    //     nama: 'Siti Nurhaliza',
    //     kelas: 'XII IPA 1',
    //     jenis_kelamin: 'P',
    //     tanggal_lahir: '2006-08-22',
    //     alamat: 'Jl. Sudirman No. 456, Jakarta',
    //     telepon: '081234567891'
    //   },
    //   {
    //     nis: '2024003',
    //     nama: 'Budi Santoso',
    //     kelas: 'XII IPS 1',
    //     jenis_kelamin: 'L',
    //     tanggal_lahir: '2006-03-10',
    //     alamat: 'Jl. Diponegoro No. 789, Jakarta',
    //     telepon: '081234567892'
    //   },
    //   {
    //     nis: '2024004',
    //     nama: 'Dewi Sartika',
    //     kelas: 'XII IPA 2',
    //     jenis_kelamin: 'P',
    //     tanggal_lahir: '2006-07-18',
    //     alamat: 'Jl. Gatot Subroto No. 321, Jakarta',
    //     telepon: '081234567893'
    //   },
    //   {
    //     nis: '2024005',
    //     nama: 'Rudi Hermawan',
    //     kelas: 'XII IPS 2',
    //     jenis_kelamin: 'L',
    //     tanggal_lahir: '2006-11-25',
    //     alamat: 'Jl. Thamrin No. 654, Jakarta',
    //     telepon: '081234567894'
    //   }
    // ];

    // const createdStudents = [];
    // for (const studentData of sampleStudents) {
    //   const student = await Siswa.create(studentData);
    //   createdStudents.push(student);
    //   console.log('Student created:', student.nama);
    // }

    // // Create sample nilai data with updated field names
    // const sampleNilai = [
    //   {
    //     siswa_id: createdStudents[0].id,
    //     semester: 'Ganjil 2024',
    //     Matematika: 85,
    //     PKN: 86,
    //     Seni_Budaya: 52,
    //     ipa: 78,
    //     Bahasa_Indonesia: 80,
    //     Bahasa_Inggris: 75,
    //     PJOK: 70,
    //     IPS: 80,
    //     Pend_Agama: 87,
    //     TIK: 78,
    //     rata_rata: 80
    //   },
    //   {
    //     siswa_id: createdStudents[1].id,
    //     semester: 'Ganjil 2024',
    //     Matematika: 92,
    //     PKN: 90,
    //     Seni_Budaya: 88,
    //     ipa: 85,
    //     Bahasa_Indonesia: 90,
    //     Bahasa_Inggris: 87,
    //     PJOK: 75,
    //     IPS: 80,
    //     Pend_Agama: 88,
    //     TIK: 83,
    //     rata_rata: 89.5
    //   },
    //   {
    //     siswa_id: createdStudents[2].id,
    //     semester: 'Ganjil 2024',
    //     Matematika: 65,
    //     PKN: 70,          
    //     Seni_Budaya: 60,  
    //     ipa: 80,          
    //     Bahasa_Indonesia: 72,
    //     Bahasa_Inggris: 70,
    //     PJOK: 50,         
    //     IPS: 90,          
    //     Pend_Agama: 60,   
    //     TIK: 70,          
    //     rata_rata: 69.7 
    //   },
    //   {
    //     siswa_id: createdStudents[3].id,
    //     semester: 'Ganjil 2024',
    //     Matematika: 88,
    //     PKN: 80,          
    //     Seni_Budaya: 50,  
    //     ipa: 90,          
    //     Bahasa_Indonesia: 85,
    //     Bahasa_Inggris: 82,
    //     PJOK: 60,         
    //     IPS: 70,          
    //     Pend_Agama: 80,   
    //     TIK: 50,          
    //     rata_rata: 75.5  
    //   },
    //   {
    //     siswa_id: createdStudents[4].id,
    //     semester: 'Ganjil 2024',
    //     Matematika: 70,
    //     PKN: 80,          
    //     Seni_Budaya: 60,  
    //     ipa: 70,          
    //     Bahasa_Indonesia: 75,
    //     Bahasa_Inggris: 72,
    //     PJOK: 50,         
    //     IPS: 90,          
    //     Pend_Agama: 80,   
    //     TIK: 60,          
    //     rata_rata: 70.7
    //   }
    // ];

    // for (const nilaiData of sampleNilai) {
    //   const nilai = await nilai.create(nilaiData);
    //   console.log('Nilai created for student ID:', nilai.siswa_id);
    // }

    console.log('Initial data seeding completed successfully!');
    console.log('\nDefault login credentials:');
    console.log('Admin: admin@sekolah.com / admin123');
    console.log('Teacher: guru.math@sekolah.com / teacher123');

  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

// Run seeder if this file is executed directly
const scriptUrl = pathToFileURL(process.argv[1]).href;
if (import.meta.url === scriptUrl) {
  import('../config/database.js').then(async ({ default: db }) => {
    try {
      await db.authenticate();
      console.log('Database connected successfully.');
      
      await seedInitialData();
      
      process.exit(0);
    } catch (error) {
      console.error('Database connection failed:', error);
      process.exit(1);
    }
  });
}