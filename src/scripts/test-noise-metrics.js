// test-noise-metrics.js
// Simple script to test that noise metrics are being stored correctly
// Run with: node src/scripts/test-noise-metrics.js

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { nanoid } from 'nanoid';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your development database or a test database
const DB_PATH = path.join(process.cwd(), 'test-db.json');

// Default empty database structure
const defaultData = {
	runs: [],
	quantumResults: [],
	pcqClassicalDetails: [],
	articles: [],
	rssFeeds: [],
};

async function main() {
	console.log('Testing noise metrics storage in LowDB...');

	// Create or open the test database
	const adapter = new JSONFile(DB_PATH);
	const db = new Low(adapter, defaultData);
	await db.read();

	// Create a test run
	const runId = nanoid();
	const testRun = {
		runId,
		timestamp: new Date().toISOString(),
		runType: 'Quantum_Shor',
		status: 'completed',
		algorithm: 'Shor',
		securityParam: 'N=15',
		iterations: 4096,
	};

	// Add the run to the database
	db.data.runs.push(testRun);
	console.log(`Created test run with ID: ${runId}`);

	// Create a test result with noise metrics
	// This simulates the data coming from a quantum workload
	const resultData = {
		status: 'success',
		execution_time_sec: 12.34,
		circuit_depth: 42,
		cx_gate_count: 123,
		total_gate_count: 456,
		backend_used: 'ibm_test_backend',
		job_id: 'test-job-id',
		shots: 4096,
		ran_on_hardware: true,
		plot_file_path: '/path/to/plot.png',
		error_message: null,
		raw_counts: { '0000': 100, '0001': 200 },

		// Noise metrics directly on the result object
		gate_error: 0.78,
		readout_error: 1.23,
		t1_time: 65.43,
		t2_time: 45.67,
		quantum_volume: 32,

		// Also put them in the data object to test both extraction paths
		data: {
			status: 'success',
			execution_time_sec: 12.34,
			circuit_depth: 42,
			gate_error: 0.78,
			readout_error: 1.23,
			t1_time: 65.43,
			t2_time: 45.67,
			quantum_volume: 32,
		},
	};

	// Extract noise & error metrics if they are nested under resultData.data
	const noiseFields = [
		'gate_error',
		'readout_error',
		't1_time',
		't2_time',
		'quantum_volume',
	];

	const flattenedNoise = {};

	if (resultData && typeof resultData === 'object') {
		// If metrics exist directly on the result object, keep them.
		noiseFields.forEach((field) => {
			if (field in resultData && resultData[field] !== undefined) {
				flattenedNoise[field] = resultData[field];
			}
		});

		// Additionally, look one level deeper (resultData.data)
		if (resultData.data && typeof resultData.data === 'object') {
			noiseFields.forEach((field) => {
				if (
					!(field in flattenedNoise) &&
					field in resultData.data &&
					resultData.data[field] !== undefined
				) {
					flattenedNoise[field] = resultData.data[field];
				}
			});
		}
	}

	console.log('Extracted noise metrics:', flattenedNoise);

	// Create and insert the result object
	const resultId = nanoid();
	const newResult = {
		resultId,
		runId,
		// Spread the original result data
		...resultData,
		// Spread flattened noise metrics last so they live at top‑level
		...flattenedNoise,
	};

	// Add the result to the database
	db.data.quantumResults.push(newResult);
	console.log(`Created test result with ID: ${resultId}`);

	// Write the database
	await db.write();
	console.log(`Database written to ${DB_PATH}`);

	// Now retrieve the result and check if noise metrics are present
	const result = db.data.quantumResults.find((r) => r.resultId === resultId);
	console.log('\nRetrieved result:');
	console.log('- gate_error:', result.gate_error);
	console.log('- readout_error:', result.readout_error);
	console.log('- t1_time:', result.t1_time);
	console.log('- t2_time:', result.t2_time);
	console.log('- quantum_volume:', result.quantum_volume);

	// Check if all noise metrics are present
	const allMetricsPresent = noiseFields.every(
		(field) => result[field] !== undefined && result[field] !== null
	);

	console.log('\nTest result:', allMetricsPresent ? 'PASSED' : 'FAILED');

	if (allMetricsPresent) {
		console.log('All noise metrics were successfully stored and retrieved');
	} else {
		console.log('Some noise metrics were missing or null');
	}

	// Clean up if requested
	if (process.argv.includes('--cleanup')) {
		fs.unlinkSync(DB_PATH);
		console.log(`Test database deleted: ${DB_PATH}`);
	}
}

main().catch(console.error);
