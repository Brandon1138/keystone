import { BenchmarkStore } from './benchmark-store';

// Create a singleton instance of the BenchmarkStore
export const benchmarkStore = new BenchmarkStore();

// Re-export the BenchmarkStore class for type usage
export { BenchmarkStore };
