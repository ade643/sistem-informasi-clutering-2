export interface ClusteringStats {
  total_results: number;
  average_distance: number;
  cluster_distribution: {
    tinggi?: { count: number };
    sedang?: { count: number };
    rendah?: { count: number };
  };
}
