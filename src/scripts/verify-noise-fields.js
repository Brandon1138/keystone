// verify-noise-fields.js
// Script to verify if noise metrics exist in the database
// Run with: node src/scripts/verify-noise-fields.js

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the actual database path from user data directory
// Note: This requires running with Electron, not just Node
// For testing with Node only, specify the path directly
const getUserDataPath = async () => {
	try {
		// Try to dynamically import electron in ESM context
		const electron = await import('electron').catch(() => null);
		// If running with Electron
		if (
			electron &&
			electron.app &&
			typeof electron.app.getPath === 'function'
		) {
			return electron.app.getPath('userData');
		}
	} catch (error) {
		console.log('Not running in Electron context, using alternative path...');
	}

	// Fallback options for non-Electron environment
	// Try to get user data path based on platform
	const homeDir = process.env.HOME || process.env.USERPROFILE;
	if (process.platform === 'win32') {
		return path.join(homeDir, 'AppData', 'Roaming', 'pqc-workbench');
	} else if (process.platform === 'darwin') {
		return path.join(
			homeDir,
			'Library',
			'Application Support',
			'pqc-workbench'
		);
	} else {
		return path.join(homeDir, '.config', 'pqc-workbench');
	}
};

async function main() {
	// Allow specifying database path directly
	const userDataPath = await getUserDataPath();
	const DB_PATH =
		process.argv[2] || path.join(userDataPath, 'pqc-workbench-results.json');

	console.log(`Verifying noise metrics in database: ${DB_PATH}`);

	// Check if the database file exists
	if (!fs.existsSync(DB_PATH)) {
		console.error(`Database file not found: ${DB_PATH}`);
		console.log('You may need to specify the path directly:');
		console.log(
			'  node src/scripts/verify-noise-fields.js /path/to/your/database.json'
		);
		process.exit(1);
	}

	// Open the database
	const adapter = new JSONFile(DB_PATH);
	const defaultData = {
		runs: [],
		quantumResults: [],
		pqcClassicalDetails: [],
		articles: [],
		rssFeeds: [],
	};
	const db = new Low(adapter, defaultData);
	await db.read();

	// Check if database structure is valid
	if (!db.data || !db.data.quantumResults) {
		console.error('Invalid database structure: missing quantumResults array');
		process.exit(1);
	}

	const quantumResults = db.data.quantumResults || [];
	console.log(`Found ${quantumResults.length} quantum results in database`);

	// Define the noise fields we're looking for
	const noiseFields = [
		'gate_error',
		'readout_error',
		't1_time',
		't2_time',
		'quantum_volume',
	];

	// Count results with noise metrics
	const resultCounts = {
		total: quantumResults.length,
		withDirectNoiseFields: 0,
		withNestedNoiseFields: 0,
		withNoNoiseFields: 0,
	};

	// Check each result
	for (const result of quantumResults) {
		let hasDirectFields = false;
		let hasNestedFields = false;

		// Check direct fields
		const directFields = noiseFields.filter(
			(field) =>
				field in result && result[field] !== null && result[field] !== undefined
		);
		if (directFields.length > 0) {
			hasDirectFields = true;
		}

		// Check nested fields in data property
		if (result.data && typeof result.data === 'object') {
			const nestedFields = noiseFields.filter(
				(field) =>
					field in result.data &&
					result.data[field] !== null &&
					result.data[field] !== undefined
			);
			if (nestedFields.length > 0) {
				hasNestedFields = true;
			}
		}

		// Update counts
		if (hasDirectFields) {
			resultCounts.withDirectNoiseFields++;
		}
		if (hasNestedFields) {
			resultCounts.withNestedNoiseFields++;
		}
		if (!hasDirectFields && !hasNestedFields) {
			resultCounts.withNoNoiseFields++;
		}
	}

	// Print results
	console.log('\nDatabase Scan Results:');
	console.log(`Total quantum results: ${resultCounts.total}`);
	console.log(
		`Results with direct noise fields: ${
			resultCounts.withDirectNoiseFields
		} (${Math.round(
			(resultCounts.withDirectNoiseFields / resultCounts.total) * 100
		)}%)`
	);
	console.log(
		`Results with nested noise fields: ${
			resultCounts.withNestedNoiseFields
		} (${Math.round(
			(resultCounts.withNestedNoiseFields / resultCounts.total) * 100
		)}%)`
	);
	console.log(
		`Results with no noise fields: ${
			resultCounts.withNoNoiseFields
		} (${Math.round(
			(resultCounts.withNoNoiseFields / resultCounts.total) * 100
		)}%)`
	);

	// Detailed analysis of a sample result (if available)
	if (quantumResults.length > 0) {
		const sample = quantumResults[quantumResults.length - 1]; // Get the most recent result
		console.log('\nSample Result Analysis:');
		console.log(`Run ID: ${sample.runId}`);
		console.log(`Result ID: ${sample.resultId}`);
		console.log('Direct noise fields:');
		for (const field of noiseFields) {
			console.log(
				`  ${field}: ${
					sample[field] !== undefined ? sample[field] : 'undefined'
				}`
			);
		}

		console.log('Nested noise fields (in data property):');
		if (sample.data && typeof sample.data === 'object') {
			for (const field of noiseFields) {
				console.log(
					`  ${field}: ${
						sample.data[field] !== undefined ? sample.data[field] : 'undefined'
					}`
				);
			}
		} else {
			console.log('  No data property found');
		}
	}
}

main().catch(console.error);
