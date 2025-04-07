# PQCBenchGUI Database Instructions

This document provides instructions for working with the database in PQCBenchGUI, which stores benchmark results and quantum workload results for future analysis, visualization, and export.

## Database Overview

PQCBenchGUI uses LowDB to store all benchmark and quantum workload results. The database is a JSON file stored in the user's application data directory.

The database contains three main collections:

- `runs`: Records of benchmark and quantum workload runs
- `quantumResults`: Results from quantum algorithm runs (Shor's and Grover's)
- `pqcClassicalDetails`: Detailed results from post-quantum cryptography and classical algorithm benchmarks

## Database File Location

The database is stored as a JSON file at:

**Windows**:

```
C:\Users\[username]\AppData\Roaming\pqcbenchgui4\pqc-workbench-results.json
```

**macOS**:

```
~/Library/Application Support/pqcbenchgui4/pqc-workbench-results.json
```

**Linux**:

```
~/.config/pqcbenchgui4/pqc-workbench-results.json
```

> Note: The exact path depends on your operating system's user data directory configuration.

## Accessing the Database Programmatically

### From within the application

The application exposes a Database API through the `window.databaseAPI` object in the renderer process. You can also use the utility functions in `src/renderer/utils/database-utils.ts` for easier access.

Example usage in a React component:

```typescript
import React, { useState, useEffect } from 'react';
import { databaseUtils } from '../utils/database-utils';

const BenchmarkHistory: React.FC = () => {
	const [runs, setRuns] = useState([]);

	useEffect(() => {
		const fetchRuns = async () => {
			// Get all benchmark runs
			const allRuns = await databaseUtils.getAllRuns();
			setRuns(allRuns);
		};

		fetchRuns();
	}, []);

	return (
		<div>
			<h2>Benchmark History</h2>
			<ul>
				{runs.map((run) => (
					<li key={run.runId}>
						{run.algorithm} ({run.securityParam}) - {run.status}
					</li>
				))}
			</ul>
		</div>
	);
};
```

### From external tools

Since the database is stored as a JSON file, you can read it directly using any programming language with JSON support. Here's an example with Python:

```python
import json
import os
from pathlib import Path

# Define path to database (adjust for your OS)
app_data_dir = os.path.expanduser('~/AppData/Roaming/pqcbenchgui4')  # Windows
# app_data_dir = os.path.expanduser('~/Library/Application Support/pqcbenchgui4')  # macOS
# app_data_dir = os.path.expanduser('~/.config/pqcbenchgui4')  # Linux

db_path = os.path.join(app_data_dir, 'pqc-workbench-results.json')

# Load the database
with open(db_path, 'r') as f:
    db = json.load(f)

# Access the data
runs = db.get('runs', [])
quantum_results = db.get('quantumResults', [])
pqc_details = db.get('pqcClassicalDetails', [])

# Example: Find all completed runs for a specific algorithm
kyber_runs = [
    run for run in runs
    if run.get('algorithm') == 'Kyber' and run.get('status') == 'completed'
]

# Print results
for run in kyber_runs:
    print(f"Run ID: {run.get('runId')}, Security Param: {run.get('securityParam')}")
```

## Common Database Operations

### Getting All Runs

```typescript
// Get all runs
const allRuns = await databaseUtils.getAllRuns();

// Get runs by type
const pqcRuns = await databaseUtils.getRunsByType('PQC_Classical');
const shorRuns = await databaseUtils.getRunsByType('Quantum_Shor');
const groverRuns = await databaseUtils.getRunsByType('Quantum_Grover');

// Get runs by status
const completedRuns = await databaseUtils.getRunsByStatus('completed');
const failedRuns = await databaseUtils.getRunsByStatus('failed');

// Get runs by algorithm
const kyberRuns = await databaseUtils.getRunsByAlgorithm('Kyber');
```

### Getting Run Details

```typescript
// Get details for a specific run
const runDetails = await databaseUtils.getRunDetails(runId);
const { run, details } = runDetails;

// run contains the metadata
// details contains the actual benchmark or quantum result data
```

### Getting All Results

```typescript
// Get all quantum results
const quantumResults = await databaseUtils.getAllQuantumResults();

// Get all PQC/Classical benchmark details
const pqcClassicalDetails = await databaseUtils.getAllPqcClassicalDetails();

// Get PQC/Classical details for a specific algorithm
const dilithiumDetails = await databaseUtils.getPqcClassicalByAlgorithm(
	'Dilithium'
);
```

## Data Visualization and Analysis

### Generating Visualizations

The database structure is designed to make it easy to generate visualizations. Here are some ideas:

1. **Performance Comparison Charts**:

   - Compare execution times across different algorithms and security parameters
   - Plot memory usage for different operations
   - Create throughput comparisons (operations per second)

2. **Time Series Analysis**:

   - Track performance changes over time for the same algorithm/parameter
   - Analyze how hardware improvements affect performance

3. **Quantum Result Visualization**:
   - Visualize probability distributions from quantum algorithm runs
   - Compare simulated vs. hardware results
   - Analyze success rates across different shots values

### Example Visualization with Chart.js

```typescript
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { databaseUtils } from '../utils/database-utils';

const KyberPerformanceChart: React.FC = () => {
	const [chartData, setChartData] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			// Get Kyber benchmark details
			const details = await databaseUtils.getPqcClassicalByAlgorithm('Kyber');

			// Process the data for visualization
			const labels = [];
			const keygenTimes = [];
			const encapsTimes = [];
			const decapsTimes = [];

			details.forEach((detail) => {
				if (detail.variant) {
					labels.push(`Kyber-${detail.variant}`);
					keygenTimes.push(detail.keygen?.avg_ms || 0);
					encapsTimes.push(detail.encaps?.avg_ms || 0);
					decapsTimes.push(detail.decaps?.avg_ms || 0);
				}
			});

			// Create chart data
			setChartData({
				labels,
				datasets: [
					{
						label: 'Key Generation (ms)',
						data: keygenTimes,
						backgroundColor: 'rgba(75, 192, 192, 0.6)',
					},
					{
						label: 'Encapsulation (ms)',
						data: encapsTimes,
						backgroundColor: 'rgba(153, 102, 255, 0.6)',
					},
					{
						label: 'Decapsulation (ms)',
						data: decapsTimes,
						backgroundColor: 'rgba(255, 159, 64, 0.6)',
					},
				],
			});
		};

		fetchData();
	}, []);

	if (!chartData) return <div>Loading...</div>;

	return (
		<div>
			<h2>Kyber Performance Comparison</h2>
			<Bar data={chartData} />
		</div>
	);
};
```

## Exporting Data for External Processing

You can export the database data for use in external tools like Excel, R, or Python data science libraries.

### Exporting to CSV

```typescript
import { databaseUtils } from '../utils/database-utils';
import { saveAs } from 'file-saver';

// Function to convert JSON data to CSV
const jsonToCSV = (data, columns) => {
	// Create header row
	const header = columns.join(',');

	// Create data rows
	const rows = data.map((item) => {
		return columns
			.map((col) => {
				// Handle nested properties using dot notation
				const value =
					col.split('.').reduce((obj, key) => obj?.[key], item) || '';
				// Escape commas and quotes
				return typeof value === 'string'
					? `"${value.replace(/"/g, '""')}"`
					: value;
			})
			.join(',');
	});

	// Combine header and rows
	return [header, ...rows].join('\n');
};

// Example: Export Dilithium benchmark results to CSV
const exportDilithiumResults = async () => {
	const details = await databaseUtils.getPqcClassicalByAlgorithm('Dilithium');

	// Define columns to export
	const columns = [
		'variant',
		'keygen.avg_ms',
		'keygen.ops_per_sec',
		'sign.avg_ms',
		'sign.ops_per_sec',
		'verify.avg_ms',
		'verify.ops_per_sec',
		'sizes.public_key_bytes',
		'sizes.secret_key_bytes',
		'sizes.signature_bytes',
	];

	// Convert to CSV
	const csv = jsonToCSV(details, columns);

	// Create blob and save file
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	saveAs(blob, 'dilithium_benchmark_results.csv');
};
```

### Exporting to JSON

```typescript
import { databaseUtils } from '../utils/database-utils';
import { saveAs } from 'file-saver';

// Example: Export all Quantum results to JSON
const exportQuantumResults = async () => {
	const quantumResults = await databaseUtils.getAllQuantumResults();

	// Create blob and save file
	const blob = new Blob([JSON.stringify(quantumResults, null, 2)], {
		type: 'application/json',
	});
	saveAs(blob, 'quantum_results.json');
};
```

## Advanced Analysis

For more advanced analysis, you might want to export the data to specialized tools:

### Python with Pandas

```python
import pandas as pd
import json
import os

# Load the database
app_data_dir = os.path.expanduser('~/AppData/Roaming/pqcbenchgui4')
db_path = os.path.join(app_data_dir, 'pqc-workbench-results.json')

with open(db_path, 'r') as f:
    db = json.load(f)

# Convert to pandas DataFrame
pqc_details = pd.json_normalize(db.get('pqcClassicalDetails', []))

# Analyze data
# Example: Compare average keygen times across different PQC algorithms
keygen_comparison = pqc_details.groupby('mainAlgorithm')['keygen.avg_ms'].mean()
print(keygen_comparison)

# Create visualizations
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 6))
keygen_comparison.plot(kind='bar')
plt.title('Average Key Generation Time by Algorithm')
plt.ylabel('Time (ms)')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('keygen_comparison.png')
```

### R for Statistical Analysis

```r
library(jsonlite)
library(dplyr)
library(ggplot2)

# Set path to the database file (adjust for your OS)
db_path <- "C:/Users/username/AppData/Roaming/pqcbenchgui4/pqc-workbench-results.json"

# Read the database
db <- fromJSON(db_path)

# Extract PQC details
pqc_details <- as.data.frame(db$pqcClassicalDetails)

# Analyze data
# Example: Compare operation times across security levels for Kyber
kyber_data <- pqc_details %>%
  filter(mainAlgorithm == "Kyber") %>%
  select(variant,
         keygen_avg_ms = keygen.avg_ms,
         encaps_avg_ms = encaps.avg_ms,
         decaps_avg_ms = decaps.avg_ms)

# Create visualization
kyber_data_long <- tidyr::pivot_longer(
  kyber_data,
  cols = c(keygen_avg_ms, encaps_avg_ms, decaps_avg_ms),
  names_to = "operation",
  values_to = "time_ms"
)

ggplot(kyber_data_long, aes(x = variant, y = time_ms, fill = operation)) +
  geom_bar(stat = "identity", position = "dodge") +
  labs(title = "Kyber Performance by Security Level",
       x = "Kyber Variant",
       y = "Time (ms)") +
  theme_minimal() +
  scale_fill_brewer(palette = "Set1")

ggsave("kyber_performance.png", width = 10, height = 6, dpi = 300)
```

## Conclusion

The database structure in PQCBenchGUI provides a robust foundation for data analysis and visualization. By following the examples above, you can leverage this data to generate insights, create visualizations, and perform comparative analysis between different cryptographic algorithms.

For more specific needs, you can always extend the database API in the application or directly manipulate the JSON file using external tools.
