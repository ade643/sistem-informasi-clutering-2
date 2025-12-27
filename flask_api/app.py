from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np


app = Flask(__name__)
CORS(app)

# ===============================
# NORMALISASI MINMAX MANUAL
# ===============================
def minmax_scale(data):
    # Konversi ke numpy array jika belum
    data_np = np.array(data, dtype=float)
    if data_np.ndim == 1: # Handle jika data hanya satu dimensi
        data_np = data_np.reshape(-1, 1)
    
    min_val = data_np.min(axis=0)
    max_val = data_np.max(axis=0)
    
    # Tambahkan epsilon untuk menghindari pembagian dengan nol
    denominator = max_val - min_val
    denominator[denominator == 0] = 1e-9
    
    scaled = (data_np - min_val) / denominator
    return scaled, min_val.tolist(), max_val.tolist()


def print_normalization(ids, vectors, data_scaled, min_val, max_val, limit=10, decimals=4):
    print("\n===== HASIL NORMALISASI MIN-MAX =====")
    print("Min per fitur:", [round(x, decimals) for x in min_val])
    print("Max per fitur:", [round(x, decimals) for x in max_val])

    show_n = min(limit, len(ids)) if limit is not None else len(ids)
    print(f"\nContoh {show_n} data pertama (ID | asli -> scaled):")
    for i in range(show_n):
        scaled_row = [round(float(x), decimals) for x in data_scaled[i]]
        print(f"- {ids[i]} | {vectors[i]} -> {scaled_row}")

    if limit is not None and len(ids) > limit:
        print(f"... ({len(ids) - limit} data tidak ditampilkan)")

# ===============================
# HITUNG JARAK EUCLIDEAN
# ===============================
def euclidean(p1, p2):
    return np.sqrt(np.sum((np.array(p1) - np.array(p2)) ** 2))


# ===============================
# K-MEANS MANUAL
# ===============================
# Diperbarui untuk mengembalikan jarak setiap titik ke centroidnya
def kmeans_manual(data_scaled, k, max_iter=300, verbose=True, show_first_n_features=3):
    data_scaled = np.array(data_scaled, dtype=float)
    n_samples = len(data_scaled)

    if k > n_samples:
        return [], [], 0, []

    # Inisialisasi centroid (catatan: ini bukan acak; ini ambil k data pertama)
    rng = np.random.default_rng(42)
    idx = rng.choice(n_samples, k, replace=False)
    centroids = data_scaled[idx].copy()

    clusters = np.zeros(n_samples, dtype=int)

    if verbose:
        print(f"\n--- Memulai Proses K-Means (K={k}) ---")
        print(f"Jumlah Cluster (K): {k}")
        print(f"Jumlah Data: {n_samples}")
        print(f"Jumlah Fitur: {data_scaled.shape[1]} Mata Pelajaran")

        print("\n>>> INISIALISASI (Centroid Awal):")
        for c_idx, c_val in enumerate(centroids):
            print(f"  Centroid {c_idx}: {c_val[:show_first_n_features].tolist()}...")

    for n_iter in range(max_iter):
        # Assign cluster
        for i, point in enumerate(data_scaled):
            distances = [euclidean(point, centroid) for centroid in centroids]
            clusters[i] = int(np.argmin(distances))

        # Update centroid (handle cluster kosong supaya tidak NaN)
        new_centroids = centroids.copy()
        for ci in range(k):
            members = data_scaled[clusters == ci]
            if len(members) == 0:
                new_centroids[ci] = data_scaled[int(rng.integers(0, n_samples))]
            else:
                new_centroids[ci] = members.mean(axis=0)


        # Hitung WCSS iterasi ini (pakai centroid sesudah update)
        dists_iter = np.linalg.norm(data_scaled - new_centroids[clusters], axis=1)
        wcss_iter = float(np.sum(dists_iter ** 2))

        if verbose:
            print(f"\n>>> ITERASI KE-{n_iter+1}")
            print(f"WCSS Iterasi: {wcss_iter:.6f}")
            for c_idx in range(k):
                n_member = int(np.sum(clusters == c_idx))
                before = centroids[c_idx][:show_first_n_features].tolist()
                after  = new_centroids[c_idx][:show_first_n_features].tolist()
                print(f"  Centroid {c_idx} ({n_member} anggota)")
                print(f"    sebelum: {before}...")
                print(f"    sesudah: {after}...")

        # Cek konvergensi
        if np.allclose(centroids, new_centroids, atol=1e-8):
            if verbose:
                print(f"\nKonvergensi tercapai pada iterasi ke-{n_iter+1}\n")
            centroids = new_centroids
            break

        centroids = new_centroids

    # Hitung WCSS final dan jarak individual
    final_dists = np.linalg.norm(data_scaled - centroids[clusters], axis=1)
    wcss = float(np.sum(final_dists ** 2))

    return clusters.tolist(), centroids.tolist(), wcss, final_dists.tolist()



# ===============================
# ENDPOINT: CLUSTERING (SEBELUMNYA /kmeans)
# ===============================
@app.route('/clustering', methods=['POST'])
def process_clustering():
    try:
        body = request.json

        # Disesuaikan dengan request dari Node.js
        data_with_ids = body['data']
        k = int(body['n_clusters'])

        # Ekstrak vektor dan ID
        ids = [item['id'] for item in data_with_ids]
        vectors = [item['vector'] for item in data_with_ids]

        if not vectors:
            return jsonify({"error": "Data vektor tidak boleh kosong"}), 400

        # Normalisasi
        data_scaled, min_val, max_val = minmax_scale(vectors)

        # TAMPILKAN HASIL NORMALISASI DI TERMINAL
        print_normalization(ids, vectors, data_scaled, min_val, max_val, limit=10)

        # Proses k-means manual
        labels, centroids, wcss, distances = kmeans_manual(
            data_scaled, k, verbose=True, show_first_n_features=3
        )

        # Format hasil sesuai yang diharapkan Node.js
        results = []
        for i in range(len(ids)):
            results.append({
                "id": ids[i],
                "cluster": labels[i],
                "distance": distances[i]
            })

        return jsonify({
            "results": results,
            "centroids": centroids,
            "wcss": wcss,
            "min_val": min_val,
            "max_val": max_val,
            "message": "K-Means manual berhasil dijalankan"
        })

    except Exception as e:
        print(f"ERROR /clustering: {e}")
        return jsonify({"error": f"Terjadi kesalahan pada server: {e}"}), 500





if __name__ == "__main__":
    app.run(debug=True, port=5001)