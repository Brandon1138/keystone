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
				const willCreateMultipleFiles = totalColumns > 30;

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
			// Create a restructured object with comprehensive data first
			jsonData = {
				benchmarkResults: data.comprehensiveData,
				metadata: data.metadata,
				// Include algorithm-specific subsets for easier analysis
				categories: {
					pqcClassical: data.comprehensiveData.filter(
						(item: any) => item.runType === 'PQC_Classical'
					),
					symmetricEncryption: data.comprehensiveData.filter(
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
					signatures: data.comprehensiveData.filter(
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
					keyExchange: data.comprehensiveData.filter(
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
					quantum: data.comprehensiveData.filter(
						(item: any) =>
							item.runType === 'Quantum_Shor' ||
							item.runType === 'Quantum_Grover'
					),
				},
				// Include the original data structure as raw_data if needed
				raw_data: {
					runs: data.runs,
					pqcClassicalDetails: data.pqcClassicalDetails,
					quantumResults: data.quantumResults,
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
			createMultipleFiles = totalColumns > 30; // If more than 30 columns, split into multiple files for better readability

			// Create main dataset
			csvData = data.comprehensiveData.map((item: any) => {
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

				// Filter Quantum data
				quantumData = data.comprehensiveData
					.filter(
						(item: any) =>
							item.runType === 'Quantum_Shor' ||
							item.runType === 'Quantum_Grover'
					)
					.map((item: any) => this.flattenObject(item));
			}
		}
		// Fall back to runs data if comprehensive data is not available
		else if (data.runs && data.runs.length > 0) {
			console.log('Using basic runs data for CSV export');
			csvData = data.runs.map((run: any) => this.flattenObject(run));
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
			// Write PQC details if available
			if (pqcData.length > 0) {
				const pqcFilePath = path.join(
					baseDir,
					`${baseFileName}_pqc_details.csv`
				);
				writePromises.push(this.writeCsvFile(pqcFilePath, pqcData));
			}

			// Write algorithm-specific files if they have data
			if (aesData.length > 0) {
				const aesFilePath = path.join(
					baseDir,
					`${baseFileName}_symmetric_encryption.csv`
				);
				writePromises.push(this.writeCsvFile(aesFilePath, aesData));
			}

			if (signatureData.length > 0) {
				const sigFilePath = path.join(
					baseDir,
					`${baseFileName}_signatures.csv`
				);
				writePromises.push(this.writeCsvFile(sigFilePath, signatureData));
			}

			if (kemData.length > 0) {
				const kemFilePath = path.join(
					baseDir,
					`${baseFileName}_key_exchange.csv`
				);
				writePromises.push(this.writeCsvFile(kemFilePath, kemData));
			}

			// Write Quantum details if available
			if (quantumData.length > 0) {
				const quantumFilePath = path.join(
					baseDir,
					`${baseFileName}_quantum_details.csv`
				);
				writePromises.push(this.writeCsvFile(quantumFilePath, quantumData));
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
			const writeStream = fs.createWriteStream(filePath);
			const csvStream = csv.format({ headers: true });
			csvStream.pipe(writeStream);

			data.forEach((row) => csvStream.write(row));
			csvStream.end();

			writeStream.on('finish', resolve);
			writeStream.on('error', reject);
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
			// Organize data by categories for better readability
			exportData = {
				benchmarkResults: data.comprehensiveData,
				metadata: data.metadata,
				// Organize data by algorithm categories
				categorizedResults: {
					symmetricEncryption: data.comprehensiveData.filter(
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
					signatures: data.comprehensiveData.filter(
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
					keyExchange: data.comprehensiveData.filter(
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
					quantum: data.comprehensiveData.filter(
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
	 * Enhanced to ensure all metrics are properly extracted
	 */
	private flattenObject(obj: any, prefix = ''): Record<string, any> {
		const result: Record<string, any> = {};

		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = obj[key];
				const newKey = prefix ? `${prefix}_${key}` : key;

				if (
					typeof value === 'object' &&
					value !== null &&
					!Array.isArray(value)
				) {
					// Special handling for operation-specific metrics to ensure all metrics are included
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
						// Add each metric directly with an informative prefix
						const opPrefix = key.charAt(0).toUpperCase() + key.slice(1);

						// For each metric type, extract with consistent naming
						for (const metricKey in value) {
							if (Object.prototype.hasOwnProperty.call(value, metricKey)) {
								// Convert snake_case to camelCase for metric names
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
					// Special handling for sizes object
					else if (key === 'sizes') {
						// Add each size metric directly
						for (const sizeKey in value) {
							if (Object.prototype.hasOwnProperty.call(value, sizeKey)) {
								// Convert snake_case to CamelCase
								const sizeMetricName = sizeKey
									.split('_')
									.map((part, idx) =>
										idx === 0
											? part
											: part.charAt(0).toUpperCase() + part.slice(1)
									)
									.join('');
								result[sizeMetricName] = value[sizeKey];
							}
						}
					} else {
						// Recursively flatten other nested objects
						Object.assign(result, this.flattenObject(value, newKey));
					}
				} else if (Array.isArray(value)) {
					// For arrays, handle them differently based on content type
					if (value.length === 0) {
						// Empty array
						result[newKey] = '[]';
					} else if (typeof value[0] === 'number') {
						// Array of numbers - join with commas
						result[newKey] = value.join(',');
					} else if (typeof value[0] === 'string') {
						// Array of strings - join with semicolons
						result[newKey] = value.join(';');
					} else {
						// Complex arrays - stringify as JSON but format better
						try {
							// For arrays of objects, try to extract key fields
							const simplifiedArray = value.map((item) => {
								if (typeof item === 'object' && item !== null) {
									// Try to extract the most relevant fields only
									const { id, name, value: itemValue, key, ...rest } = item;
									return { id, name, value: itemValue, key, ...rest };
								}
								return item;
							});
							result[newKey] = JSON.stringify(simplifiedArray);
						} catch (e) {
							// Fall back to standard JSON stringify
							result[newKey] = JSON.stringify(value);
						}
					}
				} else if (value === null || value === undefined) {
					// Handle null/undefined values more explicitly
					result[newKey] = '';
				} else {
					// Regular values
					result[newKey] = value;
				}
			}
		}

		return result;
	}
}

// Create and export a singleton instance
export const exportService = new ExportService();
