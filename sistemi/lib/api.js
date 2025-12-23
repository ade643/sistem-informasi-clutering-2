const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method untuk request JSON
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const { signal, ...restOptions } = options;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...restOptions.headers,
      },
      ...restOptions,
      signal,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.logout();
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        if (response.status >= 500) {
          throw new Error('Terjadi kesalahan server. Silakan coba lagi nanti.');
        }
        const message = errorData.message || `Error ${response.status}: ${response.statusText}`;
        const error = new Error(message);
        error.errors = errorData.errors; // Attach errors array from backend
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      // Jangan laporkan AbortError sebagai error, karena itu adalah bagian normal dari alur pembatalan
      if (error.name !== 'AbortError') {
        console.error('API Error:', error);
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  // Helper method untuk upload file (FormData)
  async uploadRequest(endpoint, formData, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      method: 'POST',
      body: formData,
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.logout();
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        if (response.status >= 500) {
          throw new Error('Terjadi kesalahan server. Silakan coba lagi nanti.');
        }
        throw errorData; // Throw the whole error object from backend
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Upload Error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  // --- All Service Methods ---

  // Authentication
  async login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }
  async register(userData) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  }
  async getProfile() {
    return this.request('/auth/profile');
  }
  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
  }

  // Siswa Management
  async getSiswa(params = {}) {
    if (Object.keys(params).length === 0) params = { all: 'true' };
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/siswa?${queryString}`);
  }
  async getSiswaById(id) { return this.request(`/siswa/${id}`); }
  async createSiswa(siswaData) {
    return this.request('/siswa', { method: 'POST', body: JSON.stringify(siswaData) });
  }
  async updateSiswa(id, siswaData) {
    return this.request(`/siswa/${id}`, { method: 'PUT', body: JSON.stringify(siswaData) });
  }
  async deleteSiswa(id) { return this.request(`/siswa/${id}`, { method: 'DELETE' }); }
  async getSiswaStats() { return this.request('/siswa/stats'); }
  async getKelasList() { return this.request('/siswa/classes'); }
 

  // Nilai Management
  async getNilaiFilters() { return this.request('/nilai/filters'); }
  async getMapel() { return this.request('/nilai/mapel'); }
  async createMapel(mapelData) { return this.request('/nilai/mapel', { method: 'POST', body: JSON.stringify(mapelData) }); }
  async getNilai(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/nilai?${queryString}`);
  }
  async createOrUpdateNilai(nilaiData) {
    return this.request('/nilai', { method: 'POST', body: JSON.stringify(nilaiData) });
  }
  async deleteNilaiBySiswa(siswa_id, semester, tahun_ajaran) {
    const params = { siswa_id, semester, tahun_ajaran };
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/nilai?${queryString}`, { method: 'DELETE' });
  }
  async uploadNilaiExcel(formData) {
    return this.uploadRequest('/nilai/upload', formData);
  }

  async getNilaiUploadHistory() {
    return this.request('/nilai/history');
  }

  async getNilaiBySiswaId(siswaId, params) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/nilai/siswa/${siswaId}?${queryString}`);
  }

  // Clustering
  async runClustering(clusteringData) {
    return this.request('/clustering/run', { method: 'POST', body: JSON.stringify(clusteringData) });
  }
  async getClusteringResults(params = {}, signal) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/clustering/results?${queryString}`, { signal });
  }
  async getClusteringStats(params = {}, signal) { 
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/clustering/stats?${queryString}`, { signal }); 
}
  
  async clearClusteringResults(params = {}) { 
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/clustering/clear?${queryString}`, { method: 'DELETE' }); 
  }
  async getElbowAnalysis(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/clustering/elbow?${queryString}`);
  }

  async downloadClusteringReport(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.downloadRequest(`/clustering/download?${queryString}`);
  }

  // --- Helper for File Downloads ---
  async downloadRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.logout();
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        const message = errorData.message || `Error ${response.status}: ${response.statusText}`;
        const error = new Error(message);
        throw error;
      }
      
      // Return the raw response to be handled by the calling function
      return response;

    } catch (error) {
      console.error('API Download Error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw error;
    }
  }

  // User Management
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/users?${queryString}`);
  }
  async getUserById(id) { return this.request(`/users/${id}`); }
  async createUser(userData) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(userData) });
  }
  async updateUser(id, userData) {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
  }
  async deleteUser(id) { return this.request(`/users/${id}`, { method: 'DELETE' }); }
  async changeUserPassword(id, newPassword) {
    return this.request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
  }
  async getUserStats() { return this.request('/users/stats'); }

  // Dashboard
  async getDashboardStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/dashboard/stats?${queryString}`);
  }
  async getDashboardFilters() {
    return this.request('/dashboard/filters');
  }
  async getChartData() { return this.request('/dashboard/charts'); }
  async getQuickStats() { return this.request('/dashboard/quick-stats'); }

  // Utility methods
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    return token && isLoggedIn === 'true';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  }
}

const apiService = new ApiService();

export default apiService;

// Helper function to generate a download link for the Excel template
export const downloadTemplate = async () => {
  // Dynamically import xlsx library to reduce initial bundle size
  const XLSX = await import('xlsx');
  try {
    const mapelData = await apiService.getMapel();
    const mapelNames = mapelData.data.map(m => m.nama_mapel);
    const headers = ["NIS", "Nama", ...mapelNames];
    const sampleRow = ["12345", "Nama Siswa Contoh", ...mapelNames.map(() => "85")];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Nilai");
    XLSX.writeFile(wb, "template_nilai.xlsx");
  } catch (error) {
    console.error("Failed to generate template:", error);
    const headers = ["nis", "semester", "tahun_ajaran", "Matematika", "Bahasa Indonesia", "Bahasa Inggris"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Nilai");
    XLSX.writeFile(wb, "template_nilai_static.xlsx");
  }
};
