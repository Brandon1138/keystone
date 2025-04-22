import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import { lowdbService } from '../db/lowdbService';

interface ExportOptions {
	format: 'csv' | 'json' | 'pdf';
	filename: string;
	data: any;
	exportPath?: string;
	useComprehensiveFormat?: boolean;
	forceDetailedExport?: boolean;
}

class ExportService {
	/**
	 * Export database content to a file
	 */
	async exportData(options: ExportOptions): Promise<{
		success: boolean;
		path?: string;
		message?: string;
		additionalFiles?: string[];
	}> {
		try {
			// Determine the initial path for the save dialog
			let defaultSavePath;
			if (options.exportPath) {
				// Use the provided export path if available
				defaultSavePath = path.join(
					options.exportPath,
					`${options.filename}.${options.format}`
				);
			} else {
				// Fall back to documents folder
				defaultSavePath = path.join(
					app.getPath('documents'),
					`${options.filename}.${options.format}`
				);
			}

			// Let the user select where to save the file
			const { filePath, canceled } = await dialog.showSaveDialog({
				title: `Export Data as ${options.format.toUpperCase()}`,
				defaultPath: defaultSavePath,
				filters: this.getFileFilters(options.format),
			});

			if (canceled || !filePath) {
				return { success: false, message: 'Export cancelled' };
			}

			// Track additional files created
			const additionalFiles: string[] = [];

			// Special handling for CSV exports to detect multiple files
			if (
				options.format === 'csv' &&
				options.data.comprehensiveData &&
				options.data.comprehensiveData.length > 0
			) {
				// Check if this will create multiple files
				const totalColumns = Object.keys(
					this.flattenObject(options.data.comprehensiveData[0])
				).length;
				// Create multiple files if:
				// 1. Explicitly requested via forceDetailedExport option, OR
				// 2. Data complexity exceeds the column threshold
				const willCreateMultipleFiles =
					options.forceDetailedExport === true || totalColumns > 30;

				console.log(
					`CSV export info - Total columns: ${totalColumns}, Will create multiple files: ${willCreateMultipleFiles}`
				);

				if (willCreateMultipleFiles) {
					const baseDir = path.dirname(filePath);
					const baseFileName = path.basename(filePath, '.csv');

					// Add expected additional files to the list
					if (
						options.data.comprehensiveData.some(
							(item: any) => item.runType === 'PQC_Classical'
						)
					) {
						additionalFiles.push(
							path.join(baseDir, `${baseFileName}_pqc_details.csv`)
						);
					}

					// Check for specific algorithm types
					const hasPqcClassical = options.data.comprehensiveData.some(
						(item: any) => item.runType === 'PQC_Classical'
					);

					if (hasPqcClassical) {
						// Check for symmetric encryption algorithms
						const hasSymmetricEncryption = options.data.comprehensiveData.some(
							(item: any) =>
								item.runType === 'PQC_Classical' &&
								((item.mainAlgorithm || item.algorithm || '')
									.toLowerCase()
									.includes('aes') ||
									['des', 'camellia', 'blowfish', 'twofish', 'chacha'].some(
										(algo) =>
											(item.mainAlgorithm || item.algorithm || '')
												.toLowerCase()
												.includes(algo)
									))
						);
						if (hasSymmetricEncryption) {
							additionalFiles.push(
								path.join(baseDir, `${baseFileName}_symmetric_encryption.csv`)
							);
						}

						// Check for signature algorithms
						const hasSignatures = options.data.comprehensiveData.some(
							(item: any) =>
								item.runType === 'PQC_Classical' &&
								(item.sign ||
									item.verify ||
									[
										'dilithium',
										'falcon',
										'sphincs',
										'rainbow',
										'picnic',
										'ecdsa',
										'ed25519',
									].some((algo) =>
										(item.mainAlgorithm || item.algorithm || '')
											.toLowerCase()
											.includes(algo)
									))
						);
						if (hasSignatures) {
							additionalFiles.push(
								path.join(baseDir, `${baseFileName}_signatures.csv`)
							);
						}

						// Check for KEM/key exchange algorithms
						const hasKeyExchange = options.data.comprehensiveData.some(
							(item: any) =>
								item.runType === 'PQC_Classical' &&
								(item.encaps ||
									item.decaps ||
									item.shared_secret ||
									[
										'kyber',
										'sike',
										'ntru',
										'mceliece',
										'frodo',
										'ecdh',
										'x25519',
									].some((algo) =>
										(item.mainAlgorithm || item.algorithm || '')
											.toLowerCase()
											.includes(algo)
									))
						);
						if (hasKeyExchange) {
							additionalFiles.push(
								path.join(baseDir, `${baseFileName}_key_exchange.csv`)
							);
						}
					}

					// Check for quantum algorithms
					if (
						options.data.comprehensiveData.some(
							(item: any) =>
								item.runType === 'Quantum_Shor' ||
								item.runType === 'Quantum_Grover'
						)
					) {
						additionalFiles.push(
							path.join(baseDir, `${baseFileName}_quantum_details.csv`)
						);
					}
				}
			}

			// Export based on the selected format
			switch (options.format) {
				case 'json':
					await this.exportAsJson(filePath, options.data);
					break;
				case 'csv':
					// Pass forceDetailedExport option to the underlying data
					if (options.forceDetailedExport) {
						options.data.forceDetailedExport = true;
					}
					await this.exportAsCsv(filePath, options.data);
					break;
				case 'pdf':
					await this.exportAsPdf(filePath, options.data);
					break;
				default:
					return { success: false, message: 'Unsupported export format' };
			}

			const result = {
				success: true,
				path: filePath,
			};

			// Add message about additional files if any were created
			if (additionalFiles.length > 0) {
				return {
					...result,
					additionalFiles,
					message: `Export successful. ${additionalFiles.length} additional file(s) were created to organize the complex data by algorithm type.`,
				};
			}

			return result;
		} catch (error) {
			console.error('Export error:', error);
			return {
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown export error',
			};
		}
	}

	/**
	 * Get file filters for the save dialog based on format
	 */
	private getFileFilters(format: string) {
		switch (format) {
			case 'json':
				return [{ name: 'JSON files', extensions: ['json'] }];
			case 'csv':
				return [{ name: 'CSV files', extensions: ['csv'] }];
			case 'pdf':
				return [{ name: 'PDF files', extensions: ['pdf'] }];
			default:
				return [{ name: 'All Files', extensions: ['*'] }];
		}
	}

	/**
	 * Export data as JSON
	 */
	private async exportAsJson(filePath: string, data: any): Promise<void> {
		// Use the full data object, but if comprehensive data is available,
		// make it the primary data for better readability
		let jsonData = data;

		// If comprehensive data is available, put it at the top level for better organization
		if (data.comprehensiveData && data.comprehensiveData.length > 0) {
			// Remove logs from quantum data to avoid bloating the export file
			const cleanedComprehensiveData = data.comprehensiveData.map(
				(item: any) => {
					if (
						item.runType === 'Quantum_Shor' ||
						item.runType === 'Quantum_Grover'
					) {
						const { logs, ...cleanedItem } = item;
						return cleanedItem;
					}
					return item;
				}
			);

			// Create a restructured object with comprehensive data first
			jsonData = {
				benchmarkResults: cleanedComprehensiveData,
				metadata: data.metadata,
				// Include algorithm-specific subsets for easier analysis
				categories: {
					pqcClassical: cleanedComprehensiveData.filter(
						(item: any) => item.runType === 'PQC_Classical'
					),
					symmetricEncryption: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							((item.mainAlgorithm || item.algorithm || '')
								.toLowerCase()
								.includes('aes') ||
								['des', 'camellia', 'blowfish', 'twofish', 'chacha'].some(
									(algo) =>
										(item.mainAlgorithm || item.algorithm || '')
											.toLowerCase()
											.includes(algo)
								))
					),
					signatures: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							(item.sign ||
								item.verify ||
								[
									'dilithium',
									'falcon',
									'sphincs',
									'rainbow',
									'picnic',
									'ecdsa',
									'ed25519',
								].some((algo) =>
									(item.mainAlgorithm || item.algorithm || '')
										.toLowerCase()
										.includes(algo)
								))
					),
					keyExchange: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							(item.encaps ||
								item.decaps ||
								item.shared_secret ||
								[
									'kyber',
									'sike',
									'ntru',
									'mceliece',
									'frodo',
									'ecdh',
									'x25519',
								].some((algo) =>
									(item.mainAlgorithm || item.algorithm || '')
										.toLowerCase()
										.includes(algo)
								))
					),
					quantum: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'Quantum_Shor' ||
							item.runType === 'Quantum_Grover'
					),
				},
				// Include the original data structure as raw_data if needed
				raw_data: {
					runs: data.runs,
					pqcClassicalDetails: data.pqcClassicalDetails,
					quantumResults: data.quantumResults
						? data.quantumResults.map((result: any) => {
								const { logs, ...cleanedResult } = result;
								return cleanedResult;
						  })
						: [],
				},
			};
		}

		// Format the JSON with indentation for readability
		const jsonString = JSON.stringify(jsonData, null, 2);
		fs.writeFileSync(filePath, jsonString, 'utf8');
	}

	/**
	 * Export data as CSV
	 * This handles the complexity of converting nested JSON to CSV format
	 */
	private async exportAsCsv(filePath: string, data: any): Promise<void> {
		// Create separate CSV files for different data types if needed
		const baseDir = path.dirname(filePath);
		const baseFileName = path.basename(filePath, '.csv');

		// For simplicity, let's focus on exporting the runs first
		// We could split into multiple files for more complex data
		let csvData: any[] = [];
		let pqcData: any[] = [];
		let quantumData: any[] = [];
		let shorData: any[] = [];
		let groverData: any[] = [];
		let aesData: any[] = [];
		let signatureData: any[] = [];
		let kemData: any[] = [];
		let createMultipleFiles = false;

		// Use comprehensive data if available
		if (data.comprehensiveData && data.comprehensiveData.length > 0) {
			console.log('Using comprehensive data format for CSV export');

			// Check if we need to split into multiple files - based on complexity of data
			const totalColumns = Object.keys(
				this.flattenObject(data.comprehensiveData[0])
			).length;
			// Lower the column threshold to 15 (from 30) to make it more likely to create detailed files
			// Also check for the forceDetailedExport flag
			createMultipleFiles =
				totalColumns > 15 || data.forceDetailedExport === true;

			console.log(
				`CSV export details - Total columns: ${totalColumns}, Creating multiple files: ${createMultipleFiles}`
			);

			// Create main dataset with logs removed from quantum data
			csvData = data.comprehensiveData.map((item: any) => {
				// Remove logs from quantum data before flattening
				if (
					item.runType === 'Quantum_Shor' ||
					item.runType === 'Quantum_Grover'
				) {
					const { logs, ...cleanedItem } = item;
					item = cleanedItem;
				}

				// For the main CSV, include just the basic run information
				if (createMultipleFiles) {
					const {
						runId,
						timestamp,
						runType,
						status,
						// Remove duplication by preferring mainAlgorithm over algorithm
						iterations,
						mainAlgorithm,
						variant,
						notes,
					} = item;
					return this.flattenObject({
						runId,
						timestamp,
						runType,
						status,
						algorithm: mainAlgorithm || item.algorithm,
						variant,
						iterations,
						notes,
					});
				}

				// Deduplicate properties before flattening
				const dedupedItem = { ...item };
				// If we have mainAlgorithm, remove the redundant algorithm field
				if (
					dedupedItem.mainAlgorithm &&
					dedupedItem.algorithm &&
					dedupedItem.mainAlgorithm !== dedupedItem.algorithm
				) {
					// Keep mainAlgorithm, which is more specific
					dedupedItem.algorithm = undefined;
				}
				// If we have variant info, securityParam may be redundant
				if (
					dedupedItem.variant &&
					dedupedItem.securityParam &&
					dedupedItem.variant === dedupedItem.securityParam
				) {
					dedupedItem.securityParam = undefined;
				}

				return this.flattenObject(dedupedItem);
			});

			// If creating multiple files, prepare algorithm-specific data files
			if (createMultipleFiles) {
				const pqcClassicalItems = data.comprehensiveData.filter(
					(item: any) => item.runType === 'PQC_Classical'
				);

				// Filter PQC data - ensure we capture all metrics
				pqcData = pqcClassicalItems.map((item: any) => {
					// Create a copy to avoid modifying the original
					const fullItem = { ...item };

					// Deduplicate redundant fields but keep all operation metrics
					if (fullItem.mainAlgorithm && fullItem.algorithm) {
						fullItem.algorithm = undefined;
					}
					if (fullItem.variant && fullItem.securityParam) {
						fullItem.securityParam = undefined;
					}

					// Make sure all metrics are included by flattening the full object
					return this.flattenObject(fullItem);
				});

				// Further categorize PQC algorithms by type for better organization
				// AES and other symmetric encryption
				aesData = pqcClassicalItems
					.filter(
						(item: any) =>
							(item.mainAlgorithm || item.algorithm || '')
								.toLowerCase()
								.includes('aes') ||
							// Include other symmetric algorithms
							['des', 'camellia', 'blowfish', 'twofish', 'chacha'].some(
								(algo) =>
									(item.mainAlgorithm || item.algorithm || '')
										.toLowerCase()
										.includes(algo)
							)
					)
					.map((item: any) => this.flattenObject(item));

				// Signature algorithms
				signatureData = pqcClassicalItems
					.filter(
						(item: any) =>
							item.sign ||
							item.verify ||
							// Include known signature algorithms
							[
								'dilithium',
								'falcon',
								'sphincs',
								'rainbow',
								'picnic',
								'ecdsa',
								'ed25519',
							].some((algo) =>
								(item.mainAlgorithm || item.algorithm || '')
									.toLowerCase()
									.includes(algo)
							)
					)
					.map((item: any) => this.flattenObject(item));

				// KEM/Key exchange algorithms
				kemData = pqcClassicalItems
					.filter(
						(item: any) =>
							item.encaps ||
							item.decaps ||
							item.shared_secret ||
							// Include known KEM algorithms
							[
								'kyber',
								'sike',
								'ntru',
								'mceliece',
								'frodo',
								'ecdh',
								'x25519',
							].some((algo) =>
								(item.mainAlgorithm || item.algorithm || '')
									.toLowerCase()
									.includes(algo)
							)
					)
					.map((item: any) => this.flattenObject(item));

				// Split quantum data into Shor and Grover
				const quantumItems = data.comprehensiveData.filter(
					(item: any) =>
						item.runType === 'Quantum_Shor' || item.runType === 'Quantum_Grover'
				);

				// Process and enhance quantum data
				quantumItems.forEach((item: any) => {
					// For quantum results, extract data from nested data property if available
					if (item.data && typeof item.data === 'object') {
						// Merge data field into the main object to flatten properly
						for (const key in item.data) {
							if (Object.prototype.hasOwnProperty.call(item.data, key)) {
								// Don't overwrite existing fields unless they're undefined
								if (!(key in item) || item[key] === undefined) {
									item[key] = item.data[key];
								}
							}
						}
					}
				});

				// Filter Quantum data and remove logs
				quantumData = quantumItems.map((item: any) => {
					// Make a clean copy without logs
					const { logs, ...cleanedItem } = item;
					return this.flattenObject(cleanedItem);
				});

				// Create separate files for Shor and Grover algorithms
				shorData = quantumItems
					.filter((item: any) => item.runType === 'Quantum_Shor')
					.map((item: any) => {
						const { logs, ...cleanedItem } = item;
						return this.flattenObject(cleanedItem);
					});

				groverData = quantumItems
					.filter((item: any) => item.runType === 'Quantum_Grover')
					.map((item: any) => {
						const { logs, ...cleanedItem } = item;
						return this.flattenObject(cleanedItem);
					});
			}
		}
		// Fall back to runs data if comprehensive data is not available
		else if (data.runs && data.runs.length > 0) {
			console.log('Using basic runs data for CSV export');

			// If we have quantumResults data, use it to enrich the runs
			if (data.quantumResults && data.quantumResults.length > 0) {
				// Create a lookup map from runs to quantum results
				const quantumResultsByRunId = new Map();
				data.quantumResults.forEach((result: any) => {
					quantumResultsByRunId.set(result.runId, result);
				});

				// Enhance runs with their associated quantum results
				csvData = data.runs.map((run: any) => {
					if (
						(run.runType === 'Quantum_Shor' ||
							run.runType === 'Quantum_Grover') &&
						quantumResultsByRunId.has(run.runId)
					) {
						// Merge run and quantum result
						const quantumResult = quantumResultsByRunId.get(run.runId);
						const mergedData = { ...run, ...quantumResult };

						// If result data is nested, extract it
						if (mergedData.data && typeof mergedData.data === 'object') {
							for (const key in mergedData.data) {
								if (
									Object.prototype.hasOwnProperty.call(mergedData.data, key)
								) {
									// Don't overwrite existing fields unless they're undefined
									if (!(key in mergedData) || mergedData[key] === undefined) {
										mergedData[key] = mergedData.data[key];
									}
								}
							}
						}

						return this.flattenObject(mergedData);
					}
					return this.flattenObject(run);
				});
			} else {
				csvData = data.runs.map((run: any) => this.flattenObject(run));
			}
		}

		// If there's no data to export
		if (csvData.length === 0) {
			throw new Error('No data available to export');
		}

		// Create a promise array to track all file writes
		const writePromises: Promise<void>[] = [];

		// Write the main CSV file
		writePromises.push(this.writeCsvFile(filePath, csvData));

		// If creating multiple files, write type-specific files
		if (createMultipleFiles) {
			console.log('Creating multiple CSV files for detailed data');

			// Write PQC details if available
			if (pqcData.length > 0) {
				const pqcFilePath = path.join(
					baseDir,
					`${baseFileName}_pqc_details.csv`
				);
				console.log(`Adding PQC details file with ${pqcData.length} rows`);
				writePromises.push(this.writeCsvFile(pqcFilePath, pqcData));
			}

			// Write algorithm-specific files if they have data
			if (aesData.length > 0) {
				const aesFilePath = path.join(
					baseDir,
					`${baseFileName}_symmetric_encryption.csv`
				);
				console.log(
					`Adding symmetric encryption file with ${aesData.length} rows`
				);
				writePromises.push(this.writeCsvFile(aesFilePath, aesData));
			}

			if (signatureData.length > 0) {
				const sigFilePath = path.join(
					baseDir,
					`${baseFileName}_signatures.csv`
				);
				console.log(`Adding signatures file with ${signatureData.length} rows`);
				writePromises.push(this.writeCsvFile(sigFilePath, signatureData));
			}

			if (kemData.length > 0) {
				const kemFilePath = path.join(
					baseDir,
					`${baseFileName}_key_exchange.csv`
				);
				console.log(`Adding key exchange file with ${kemData.length} rows`);
				writePromises.push(this.writeCsvFile(kemFilePath, kemData));
			}

			// Write Quantum details if available - combined file
			if (quantumData.length > 0) {
				const quantumFilePath = path.join(
					baseDir,
					`${baseFileName}_quantum_details.csv`
				);
				console.log(
					`Adding quantum details file with ${quantumData.length} rows`
				);
				writePromises.push(this.writeCsvFile(quantumFilePath, quantumData));
			}

			// Write separate Shor algorithm data if available
			if (shorData.length > 0) {
				const shorFilePath = path.join(
					baseDir,
					`${baseFileName}_shor_algorithm.csv`
				);
				console.log(
					`Adding Shor's algorithm file with ${shorData.length} rows`
				);
				writePromises.push(this.writeCsvFile(shorFilePath, shorData));
			}

			// Write separate Grover algorithm data if available
			if (groverData.length > 0) {
				const groverFilePath = path.join(
					baseDir,
					`${baseFileName}_grover_algorithm.csv`
				);
				console.log(
					`Adding Grover's algorithm file with ${groverData.length} rows`
				);
				writePromises.push(this.writeCsvFile(groverFilePath, groverData));
			}
		}

		// Wait for all files to be written
		await Promise.all(writePromises);
	}

	/**
	 * Helper method to write data to a CSV file
	 */
	private writeCsvFile(filePath: string, data: any[]): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				console.log(
					`Writing CSV file to: ${filePath} with ${data.length} rows`
				);

				const writeStream = fs.createWriteStream(filePath);
				const csvStream = csv.format({ headers: true });
				csvStream.pipe(writeStream);

				data.forEach((row) => csvStream.write(row));
				csvStream.end();

				writeStream.on('finish', () => {
					console.log(`Successfully wrote CSV file: ${filePath}`);
					resolve();
				});

				writeStream.on('error', (err) => {
					console.error(`Error writing CSV file ${filePath}:`, err);
					reject(err);
				});
			} catch (error) {
				console.error(
					`Exception while setting up CSV file ${filePath}:`,
					error
				);
				reject(error);
			}
		});
	}

	/**
	 * Export data as PDF
	 * This requires a PDF generation library, which would need to be installed
	 */
	private async exportAsPdf(filePath: string, data: any): Promise<void> {
		// For now, use JSON export as a fallback since PDF generation
		// requires additional dependencies like pdfkit or jspdf

		// Use comprehensive data if available
		let exportData = data;
		if (data.comprehensiveData && data.comprehensiveData.length > 0) {
			// Remove logs from quantum data
			const cleanedComprehensiveData = data.comprehensiveData.map(
				(item: any) => {
					if (
						item.runType === 'Quantum_Shor' ||
						item.runType === 'Quantum_Grover'
					) {
						const { logs, ...cleanedItem } = item;
						return cleanedItem;
					}
					return item;
				}
			);

			// Organize data by categories for better readability
			exportData = {
				benchmarkResults: cleanedComprehensiveData,
				metadata: data.metadata,
				// Organize data by algorithm categories
				categorizedResults: {
					symmetricEncryption: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							((item.mainAlgorithm || item.algorithm || '')
								.toLowerCase()
								.includes('aes') ||
								['des', 'camellia', 'blowfish', 'twofish', 'chacha'].some(
									(algo) =>
										(item.mainAlgorithm || item.algorithm || '')
											.toLowerCase()
											.includes(algo)
								))
					),
					signatures: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							(item.sign ||
								item.verify ||
								[
									'dilithium',
									'falcon',
									'sphincs',
									'rainbow',
									'picnic',
									'ecdsa',
									'ed25519',
								].some((algo) =>
									(item.mainAlgorithm || item.algorithm || '')
										.toLowerCase()
										.includes(algo)
								))
					),
					keyExchange: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'PQC_Classical' &&
							(item.encaps ||
								item.decaps ||
								item.shared_secret ||
								[
									'kyber',
									'sike',
									'ntru',
									'mceliece',
									'frodo',
									'ecdh',
									'x25519',
								].some((algo) =>
									(item.mainAlgorithm || item.algorithm || '')
										.toLowerCase()
										.includes(algo)
								))
					),
					quantum: cleanedComprehensiveData.filter(
						(item: any) =>
							item.runType === 'Quantum_Shor' ||
							item.runType === 'Quantum_Grover'
					),
				},
			};
		}

		const jsonString = JSON.stringify(exportData, null, 2);

		// In a real implementation, we would use a PDF library to create
		// a well-formatted PDF document with tables, etc.
		// For this demo, we'll create a simple text file with a PDF extension
		fs.writeFileSync(
			filePath,
			`PQC Benchmark Data Export\n\n` +
				`Export Date: ${new Date().toLocaleString()}\n\n` +
				`Data (JSON format):\n${jsonString}`,
			'utf8'
		);

		// In a production app, you would replace this with proper PDF generation
		console.log(
			'Note: PDF export is using a simple text format. Install a PDF library for better formatting.'
		);
	}

	/**
	 * Helper function to flatten nested objects for CSV export
	 * Enhanced to ensure all metrics are properly extracted, especially for quantum results.
	 */
	private flattenObject(obj: any, prefix = ''): Record<string, any> {
		// Create a working copy to avoid modifying the original object
		let cleanedObj = { ...obj };

		// --- Pre-processing Step ---
		// Perform initial cleanup and structural adjustments before main flattening
		if (cleanedObj && typeof cleanedObj === 'object') {
			// 1. Remove 'logs' field early from the top level
			if ('logs' in cleanedObj) {
				delete cleanedObj.logs;
			}

			// 2. Handle nested 'data' specifically for Quantum runs
			// Promote nested data fields to the top level, avoiding overwrites.
			if (
				(cleanedObj.runType === 'Quantum_Shor' ||
					cleanedObj.runType === 'Quantum_Grover') &&
				cleanedObj.data &&
				typeof cleanedObj.data === 'object'
			) {
				const nestedData = { ...cleanedObj.data }; // Copy nested data

				// Remove logs from nested data as well, if present
				if ('logs' in nestedData) {
					delete nestedData.logs;
				}

				// Promote keys from nested 'data' to the top level of cleanedObj
				for (const key in nestedData) {
					if (Object.prototype.hasOwnProperty.call(nestedData, key)) {
						// Only copy if the key doesn't exist at the top level OR if the top-level value is null/undefined.
						// This prevents overwriting potentially more specific top-level data with nested data.
						if (
							!(key in cleanedObj) ||
							cleanedObj[key] === undefined ||
							cleanedObj[key] === null
						) {
							cleanedObj[key] = nestedData[key];
						}
						// Optional: Add logging here if a key collision prevents promotion and it's important to know
						// else {
						//    console.warn(`FlattenObject: Key "${key}" exists in both main object and nested 'data'. Using value from main object for runId: ${cleanedObj.runId}`);
						// }
					}
				}
				// Remove the original 'data' field after its contents have been processed/promoted
				delete cleanedObj.data;
			}

			// 3. Special handling for ECDSA/ECDH: Use 'curve' as 'variant' if variant is missing/generic
			if (
				cleanedObj.curve &&
				['ecdsa', 'ecdh'].includes(
					(cleanedObj.mainAlgorithm || cleanedObj.algorithm || '').toLowerCase()
				) &&
				(cleanedObj.variant === 'unknown' || !cleanedObj.variant)
			) {
				cleanedObj.variant = cleanedObj.curve;
				// Consider removing the original curve field if it's now redundant:
				// delete cleanedObj.curve;
			}
			// Add any other pre-processing steps here if needed
		}
		// --- End of Pre-processing Step ---

		// --- Main Flattening Loop ---
		const result: Record<string, any> = {};
		// Iterate over the potentially modified cleanedObj after pre-processing
		for (const key in cleanedObj) {
			if (Object.prototype.hasOwnProperty.call(cleanedObj, key)) {
				const value = cleanedObj[key];
				const newKey = prefix ? `${prefix}_${key}` : key;

				// Skip 'logs' and 'data' fields explicitly, as they are handled in pre-processing
				if (key === 'logs' || key === 'data') {
					continue;
				}

				// Handle nested objects (excluding arrays)
				if (
					typeof value === 'object' &&
					value !== null &&
					!Array.isArray(value)
				) {
					// Special handling for operation-specific metrics (keygen, sign, etc.)
					if (
						[
							'keygen',
							'sign',
							'verify',
							'encaps',
							'decaps',
							'encryption',
							'decryption',
							'shared_secret',
						].includes(key)
					) {
						const opPrefix = key.charAt(0).toUpperCase() + key.slice(1);
						for (const metricKey in value) {
							if (Object.prototype.hasOwnProperty.call(value, metricKey)) {
								// Convert snake_case metricKey to camelCase for the final CSV header
								const metricName = metricKey
									.split('_')
									.map((part, idx) =>
										idx === 0
											? part
											: part.charAt(0).toUpperCase() + part.slice(1)
									)
									.join('');
								result[`${opPrefix}_${metricName}`] = value[metricKey];
							}
						}
					}
					// Special handling for 'sizes' object
					else if (key === 'sizes') {
						for (const sizeKey in value) {
							if (Object.prototype.hasOwnProperty.call(value, sizeKey)) {
								// Convert snake_case sizeKey to camelCase for the final CSV header
								const sizeMetricName = sizeKey
									.split('_')
									.map((part) => part.charAt(0).toUpperCase() + part.slice(1)) // Capitalize all parts for CamelCase
									.join('');
								// Prepend 'Size' for clarity unless the key already implies it
								const finalSizeKey = sizeMetricName
									.toLowerCase()
									.includes('size')
									? sizeMetricName
									: `Size${sizeMetricName}`;
								result[finalSizeKey] = value[sizeKey];
							}
						}
					}
					// Generic handling for other nested objects: recursively flatten
					else {
						// Recursively flatten using the current key as the new prefix
						Object.assign(result, this.flattenObject(value, newKey));
					}
				}
				// Handle arrays
				else if (Array.isArray(value)) {
					// Represent arrays in a CSV-friendly format
					if (value.length === 0) {
						result[newKey] = '[]'; // Empty array representation
					} else if (
						value.every(
							(item) =>
								typeof item === 'number' ||
								typeof item === 'string' ||
								item === null ||
								item === undefined
						)
					) {
						// Array of simple primitives (numbers, strings, null, undefined)
						// Join numbers with comma, strings/mixed with semicolon
						const separator = value.every((item) => typeof item === 'number')
							? ','
							: ';';
						result[newKey] = value
							.map((v) => (v === null || v === undefined ? '' : v))
							.join(separator);
					} else {
						// Array contains objects or mixed complex types: stringify as JSON
						try {
							// Attempt to create a simplified JSON representation
							const simplifiedArray = value.map((item) => {
								if (typeof item === 'object' && item !== null) {
									// Remove logs from nested objects within the array
									let cleanedItem = { ...item };
									if ('logs' in cleanedItem) {
										delete cleanedItem.logs;
									}
									// Optionally, try to extract key fields if structure is known/consistent
									// const { id, name, value: itemValue, ...rest } = cleanedItem;
									// return { id, name, value: itemValue, ...rest };
									return cleanedItem; // Return cleaned item for now
								}
								return item; // Return non-object items as is
							});
							result[newKey] = JSON.stringify(simplifiedArray);
						} catch (e) {
							// Fallback to standard JSON stringify if simplification fails
							result[newKey] = JSON.stringify(value);
						}
					}
				}
				// Handle null or undefined values
				else if (value === null || value === undefined) {
					result[newKey] = ''; // Represent null/undefined as empty string in CSV
				}
				// Handle primitive values (string, number, boolean)
				else {
					result[newKey] = value;
				}
			}
		}
		// --- End of Main Flattening Loop ---

		return result;
	}
}

// Create and export a singleton instance
export const exportService = new ExportService();
