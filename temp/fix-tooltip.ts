const fs = require('fs');
const path = require('path');

// The files to fix
const files = [
	path.join(
		__dirname,
		'..',
		'src',
		'renderer',
		'components',
		'ui',
		'JobQueueDisplay.tsx'
	),
	path.join(
		__dirname,
		'..',
		'src',
		'renderer',
		'components',
		'EncryptionRunner.tsx'
	),
	path.join(
		__dirname,
		'..',
		'src',
		'renderer',
		'components',
		'BenchmarkRunner.tsx'
	),
	path.join(
		__dirname,
		'..',
		'src',
		'renderer',
		'components',
		'ui',
		'JobSchedulerForm.tsx'
	),
];

// Fix Tooltip in EncryptionRunner.tsx
function fixEncryptionRunnerTooltip(content) {
	// Find the problematic Tooltip and replace it with a correct version
	const tooltipRegex =
		/<Tooltip title={\`Size: \${formatBytes\(keyBuffer\.length\)}\`}>/g;
	return content.replace(
		tooltipRegex,
		'<Tooltip title={`Size: ${formatBytes(keyBuffer.length)}`}>'
	);
}

// Fix InputLabel in files
function fixInputLabel(content) {
	// Find InputLabel without children and add children
	const inputLabelRegex = /<InputLabel\s+id="([^"]+)"\s+([^>]*)>/g;
	return content.replace(inputLabelRegex, (match, id, rest) => {
		// Extract label from id by converting it to title case and removing hyphens
		let label = id
			.replace(/-label$/, '')
			.replace(/-([a-z])/g, (_, letter) => ' ' + letter.toUpperCase());
		label = label.charAt(0).toUpperCase() + label.slice(1);

		return `<InputLabel id="${id}" ${rest}>${label}</InputLabel>`;
	});
}

// Process each file
files.forEach((filePath) => {
	try {
		console.log(`Processing ${filePath}`);

		if (fs.existsSync(filePath)) {
			let content = fs.readFileSync(filePath, 'utf8');

			// Apply fixes
			if (filePath.includes('EncryptionRunner.tsx')) {
				content = fixEncryptionRunnerTooltip(content);
			}

			content = fixInputLabel(content);

			// Write back the file
			fs.writeFileSync(filePath, content);
			console.log(`Fixed ${filePath}`);
		} else {
			console.log(`File not found: ${filePath}`);
		}
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error);
	}
});
