import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import { lowdbService } from '../db/lowdbService';

interface ExportOptions {
	format: 'csv' | 'json' | 'pdf';
	filename: string;
	data: any;
}

class ExportService {
	/**
	 * Export database content to a file
	 */
	async exportData(options: ExportOptions): Promise<{
		success: boolean;
		path?: string;
		message?: string;
	}> {
		try {
			// Let the user select where to save the file
			const { filePath, canceled } = await dialog.showSaveDialog({
				title: `Export Data as ${options.format.toUpperCase()}`,
				defaultPath: path.join(
					app.getPath('documents'),
					`${options.filename}.${options.format}`
				),
				filters: this.getFileFilters(options.format),
			});

			if (canceled || !filePath) {
				return { success: false, message: 'Export cancelled' };
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

			return { success: true, path: filePath };
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
		// Format the JSON with indentation for readability
		const jsonString = JSON.stringify(data, null, 2);
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

		// Process runs data
		if (data.runs && data.runs.length > 0) {
			csvData = data.runs.map((run: any) => this.flattenObject(run));
		}

		// If there's PQC or Quantum data, we might want to handle that separately
		// based on the app's specific requirements

		// Write the CSV file
		const writeStream = fs.createWriteStream(filePath);
		const csvStream = csv.format({ headers: true });
		csvStream.pipe(writeStream);

		csvData.forEach((row) => csvStream.write(row));
		csvStream.end();

		// Return a promise that resolves when the file is written
		return new Promise((resolve, reject) => {
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
		const jsonString = JSON.stringify(data, null, 2);

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
					// Recursively flatten nested objects
					Object.assign(result, this.flattenObject(value, newKey));
				} else if (Array.isArray(value)) {
					// Handle arrays - convert to string for CSV
					result[newKey] = JSON.stringify(value);
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
