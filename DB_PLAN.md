# Database Implementation Plan for PQCBenchGUI4

## Overview

This document outlines the comprehensive database implementation plan for the PQCBenchGUI4 application, a multi-backend workbench for post-quantum cryptography and quantum runtimes. The database will store benchmark results for cryptographic algorithms and quantum workload outputs.

## Database Requirements

1. **Persistent Storage**: The database must persist data across application restarts.
2. **Performance**: Must handle complex queries efficiently for visualization features.
3. **Cross-Platform**: Must work on Windows, macOS, and Linux.
4. **No Configuration**: Must work without requiring users to set up or maintain a database server.
5. **Backup/Restore**: Support for exporting and importing data.

## Database Selection: SQLite

**SQLite** is the optimal choice for the PQCBenchGUI4 application for the following reasons:

- **Embedded database** - requires no separate server process
- **Zero configuration** - works out of the box
- **Cross-platform compatibility** - runs on all supported platforms
- **Direct file access** - easy backup and restore through file copying
- **Excellent performance** for the expected data volume
- **Mature ecosystem** with good tools and libraries
- **Native integration** with Electron applications

## Library Selection: better-sqlite3

We'll use the `better-sqlite3` Node.js library because it offers:

- **Performance**: Significantly faster than other SQLite libraries
- **Prepared statements**: Efficient query execution
- **Proper transaction support**: Essential for data integrity
- **Synchronous API**: Simpler to reason about in an Electron context
- **Active maintenance**: Regular updates and security patches

## Database Schema

The database will be structured with the following tables:

### 1. Cryptographic Benchmark Tables

#### `benchmarks` Table

Stores the top-level benchmark information:

```sql
CREATE TABLE benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    benchmark_id TEXT NOT NULL UNIQUE,  -- UUID for the benchmark
    algorithm TEXT NOT NULL,            -- 'Kyber', 'Dilithium', 'AES-GCM', etc.
    parameter_set TEXT,                 -- 'Kyber-512', 'Dilithium-2', 'secp256r1', etc.
    iterations INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,         -- Unix timestamp
    status TEXT NOT NULL,               -- 'completed', 'failed', 'in_progress'
    execution_time_sec REAL,
    error_message TEXT
);
```

#### `benchmark_operations` Table

Stores metrics for each operation within a benchmark:

```sql
CREATE TABLE benchmark_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    benchmark_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,       -- 'keygen', 'sign', 'verify', 'encaps', 'decaps', etc.
    min_ms REAL,
    max_ms REAL,
    avg_ms REAL,
    ops_per_sec REAL,
    mem_peak_kb REAL,
    mem_avg_kb REAL,
    FOREIGN KEY (benchmark_id) REFERENCES benchmarks(benchmark_id) ON DELETE CASCADE
);
```

#### `benchmark_sizes` Table

Stores size information for keys, signatures, ciphertexts:

```sql
CREATE TABLE benchmark_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    benchmark_id TEXT NOT NULL,
    size_type TEXT NOT NULL,           -- 'public_key_bytes', 'secret_key_bytes', etc.
    size_bytes INTEGER NOT NULL,
    FOREIGN KEY (benchmark_id) REFERENCES benchmarks(benchmark_id) ON DELETE CASCADE
);
```

### 2. Quantum Workload Tables

#### `quantum_workloads` Table

Stores quantum workload execution information:

```sql
CREATE TABLE quantum_workloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL UNIQUE,   -- UUID for the workload
    algorithm TEXT NOT NULL,            -- 'shor', 'grover'
    timestamp INTEGER NOT NULL,         -- Unix timestamp
    status TEXT NOT NULL,               -- 'success', 'error'
    backend_used TEXT NOT NULL,         -- 'aer_simulator', 'ibm_sherbrooke', etc.
    ran_on_hardware BOOLEAN NOT NULL,   -- true/false
    shots INTEGER NOT NULL,
    execution_time_sec REAL,
    circuit_depth INTEGER,
    cx_gate_count INTEGER,
    total_gate_count INTEGER,
    job_id TEXT,                        -- ID from IBM Quantum
    plot_file_path TEXT,
    error_message TEXT
);
```

#### `shor_workload_details` Table

Stores details specific to Shor's algorithm:

```sql
CREATE TABLE shor_workload_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL UNIQUE,
    n_value INTEGER NOT NULL,
    a_value INTEGER NOT NULL,
    FOREIGN KEY (workload_id) REFERENCES quantum_workloads(workload_id) ON DELETE CASCADE
);
```

#### `shor_factors` Table

Stores factors found by Shor's algorithm:

```sql
CREATE TABLE shor_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL,
    factor INTEGER NOT NULL,
    FOREIGN KEY (workload_id) REFERENCES quantum_workloads(workload_id) ON DELETE CASCADE
);
```

#### `grover_workload_details` Table

Stores details specific to Grover's algorithm:

```sql
CREATE TABLE grover_workload_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL UNIQUE,
    num_qubits INTEGER NOT NULL,
    top_measured_state TEXT NOT NULL,
    top_measured_count INTEGER NOT NULL,
    found_correct_state BOOLEAN NOT NULL,
    FOREIGN KEY (workload_id) REFERENCES quantum_workloads(workload_id) ON DELETE CASCADE
);
```

#### `grover_marked_states` Table

Stores the marked states for Grover's algorithm:

```sql
CREATE TABLE grover_marked_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL,
    marked_state TEXT NOT NULL,
    FOREIGN KEY (workload_id) REFERENCES quantum_workloads(workload_id) ON DELETE CASCADE
);
```

#### `quantum_measurement_counts` Table

Stores measurement results from quantum circuits:

```sql
CREATE TABLE quantum_measurement_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workload_id TEXT NOT NULL,
    measured_state TEXT NOT NULL,
    count INTEGER NOT NULL,
    FOREIGN KEY (workload_id) REFERENCES quantum_workloads(workload_id) ON DELETE CASCADE
);
```

### 3. Scheduled Jobs Tables

#### `scheduled_jobs` Table

Stores information about scheduled benchmark jobs:

```sql
CREATE TABLE scheduled_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL UNIQUE,        -- UUID for the job
    name TEXT NOT NULL,
    job_type TEXT NOT NULL,             -- 'benchmark', 'quantum_workload'
    status TEXT NOT NULL,               -- 'scheduled', 'running', 'completed', 'failed'
    schedule TEXT NOT NULL,             -- Cron expression
    created_at INTEGER NOT NULL,        -- Unix timestamp
    last_run INTEGER,                   -- Unix timestamp
    next_run INTEGER,                   -- Unix timestamp
    error_message TEXT
);
```

#### `scheduled_job_params` Table

Stores parameters for scheduled jobs:

```sql
CREATE TABLE scheduled_job_params (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    param_name TEXT NOT NULL,
    param_value TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES scheduled_jobs(job_id) ON DELETE CASCADE
);
```

## Implementation Steps

### 1. Initial Setup (Week 1)

1. **Install dependencies**:

   ```bash
   npm install better-sqlite3 node-schedule uuid
   ```

2. **Create database service module** (`src/main/db/database.ts`):

   - Database connection initialization
   - Schema creation
   - Utility functions for common operations

3. **Implement repository pattern**:
   - `BenchmarkRepository` for cryptographic benchmarks
   - `QuantumWorkloadRepository` for quantum results
   - `ScheduledJobRepository` for job scheduling

### 2. Database Schema Implementation (Week 1)

1. **Write schema migration script** (`src/main/db/migrations.ts`):

   - Create all tables with proper constraints
   - Add indexes for performance optimization

2. **Implement data models** (`src/types/db-models.ts`):
   - Define TypeScript interfaces for database entities
   - Set up type mapping between JSON and database records

### 3. Benchmark Integration (Week 2)

1. **Update `benchmarkManager.ts`**:

   - Modify result handling to save to database
   - Implement loading of historical results

2. **Create database accessors**:

   - CRUD operations for benchmarks
   - Query methods for retrieving results

3. **Implement benchmark data transformation**:
   - Convert from JSON format to database records
   - Handle nested data structures

### 4. Quantum Workload Integration (Week 2)

1. **Update quantum workload handlers**:

   - Save results to database after execution
   - Load historical quantum results

2. **Create quantum data accessors**:
   - CRUD operations for quantum workloads
   - Specialized query methods for Shor and Grover results

### 5. Scheduled Jobs Implementation (Week 3)

1. **Create scheduler service** (`src/main/scheduler/scheduler.ts`):

   - Job scheduling interface
   - Persistence of job definitions
   - Handling of job execution

2. **Implement IPC handlers for schedulers**:
   - Create/read/update/delete scheduled jobs
   - Manually trigger scheduled jobs
   - Get job status information

### 6. Data Export/Import (Week 3)

1. **Implement data export functionality**:

   - Export to JSON (full database or selected records)
   - Export to CSV (formatted for analysis)
   - Export to PDF (formatted reports)

2. **Implement data import functionality**:
   - Import from JSON backup
   - Validate imported data
   - Handle duplicates and conflicts

### 7. User Interface Integration (Week 4)

1. **Update renderer components**:

   - Modify `BenchmarkDashboard.tsx` to use database data
   - Update `QuantumWorkloadRunner.tsx` to store and retrieve results
   - Create `ScheduledJobsManager.tsx` component

2. **Add visualization components**:
   - Implement charts and graphs for benchmark comparisons
   - Create timeline view for benchmark history
   - Develop interactive visualizations for quantum results

### 8. Testing and Validation (Week 4)

1. **Write unit tests**:

   - Test database operations
   - Test data transformation logic

2. **End-to-end testing**:
   - Verify data flow from UI to database and back
   - Test import/export functionality
   - Validate scheduled job execution

## Database Access Layer

### Core Database Service

```typescript
// src/main/db/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export class DatabaseService {
	private db: Database.Database;
	private static instance: DatabaseService;

	private constructor() {
		const userDataPath = app.getPath('userData');
		const dbDir = path.join(userDataPath, 'db');

		// Ensure directory exists
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}

		const dbPath = path.join(dbDir, 'pqcbench.db');

		this.db = new Database(dbPath, {
			// Enable foreign keys support
			verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
		});

		// Enable foreign keys
		this.db.pragma('foreign_keys = ON');

		// Initialize schema
		this.initializeSchema();
	}

	static getInstance(): DatabaseService {
		if (!DatabaseService.instance) {
			DatabaseService.instance = new DatabaseService();
		}
		return DatabaseService.instance;
	}

	getDb(): Database.Database {
		return this.db;
	}

	private initializeSchema(): void {
		// Create tables if they don't exist
		this.db.exec(`
      -- Benchmarks table
      CREATE TABLE IF NOT EXISTS benchmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        benchmark_id TEXT NOT NULL UNIQUE,
        algorithm TEXT NOT NULL,
        parameter_set TEXT,
        iterations INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        execution_time_sec REAL,
        error_message TEXT
      );

      -- Rest of the schema creation statements...
    `);
	}

	// Database operations
	beginTransaction(): void {
		this.db.prepare('BEGIN').run();
	}

	commit(): void {
		this.db.prepare('COMMIT').run();
	}

	rollback(): void {
		this.db.prepare('ROLLBACK').run();
	}

	// Backup the database to a file
	backup(destinationPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const dest = new Database(destinationPath);
				this.db
					.backup(dest)
					.then(() => {
						dest.close();
						resolve();
					})
					.catch((err) => {
						dest.close();
						reject(err);
					});
			} catch (err) {
				reject(err);
			}
		});
	}

	// Close database connection
	close(): void {
		this.db.close();
	}
}
```

### Repository Implementations

Example of a repository implementation for benchmarks:

```typescript
// src/main/db/benchmarkRepository.ts
import { DatabaseService } from './database';
import { v4 as uuidv4 } from 'uuid';
import {
	BenchmarkResult,
	BenchmarkOperation,
	BenchmarkSize,
} from '../../types/db-models';

export class BenchmarkRepository {
	private db: Database.Database;

	constructor() {
		this.db = DatabaseService.getInstance().getDb();
	}

	create(benchmark: BenchmarkResult): string {
		const benchmarkId = benchmark.benchmark_id || uuidv4();

		const dbService = DatabaseService.getInstance();

		try {
			dbService.beginTransaction();

			// Insert benchmark record
			const stmt = this.db.prepare(`
        INSERT INTO benchmarks 
        (benchmark_id, algorithm, parameter_set, iterations, timestamp, status, execution_time_sec, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

			stmt.run(
				benchmarkId,
				benchmark.algorithm,
				benchmark.parameter_set,
				benchmark.iterations,
				benchmark.timestamp || Date.now(),
				benchmark.status,
				benchmark.execution_time_sec,
				benchmark.error_message || null
			);

			// Insert operations
			if (benchmark.operations) {
				const opStmt = this.db.prepare(`
          INSERT INTO benchmark_operations
          (benchmark_id, operation_type, min_ms, max_ms, avg_ms, ops_per_sec, mem_peak_kb, mem_avg_kb)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

				for (const op of benchmark.operations) {
					opStmt.run(
						benchmarkId,
						op.operation_type,
						op.min_ms,
						op.max_ms,
						op.avg_ms,
						op.ops_per_sec,
						op.mem_peak_kb,
						op.mem_avg_kb
					);
				}
			}

			// Insert sizes
			if (benchmark.sizes) {
				const sizeStmt = this.db.prepare(`
          INSERT INTO benchmark_sizes
          (benchmark_id, size_type, size_bytes)
          VALUES (?, ?, ?)
        `);

				for (const [type, bytes] of Object.entries(benchmark.sizes)) {
					sizeStmt.run(benchmarkId, type, bytes);
				}
			}

			dbService.commit();
			return benchmarkId;
		} catch (error) {
			dbService.rollback();
			throw error;
		}
	}

	// Additional methods for retrieving, updating, and deleting benchmarks
}
```

## Conclusion

This database implementation plan provides a comprehensive strategy for persistently storing benchmark and quantum workload results in the PQCBenchGUI4 application. Using SQLite with better-sqlite3 provides an optimal solution that doesn't require configuration, works cross-platform, and has excellent performance characteristics for the application's needs.

The schema design accommodates all current data types while allowing for future extensibility. The repository pattern implementation provides a clean separation of concerns and makes the database layer easily testable and maintainable.

By following this implementation plan, the application will be able to store, retrieve, analyze, and visualize benchmark data effectively, enabling powerful comparisons between different cryptographic algorithms and quantum workload executions.
