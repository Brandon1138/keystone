const path = require('path');

module.exports = [
	{
		mode: 'development',
		entry: './src/main/main.ts',
		target: 'electron-main',
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
			],
		},
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'main.js',
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
		},
	},
	{
		mode: 'development',
		entry: './src/main/preload.js',
		target: 'electron-preload',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'preload.js',
		},
	},
	{
		mode: 'development',
		entry: './src/renderer/renderer.tsx',
		target: 'electron-renderer',
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
				{
					test: /\.css$/,
					use: [
						'style-loader',
						{
							loader: 'css-loader',
							options: {
								importLoaders: 1,
							},
						},
						'postcss-loader',
					],
				},
			],
		},
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'renderer.js',
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
		},
	},
];
