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
				// Exclude native addon modules from webpack processing
				{
					test: /\.node$/,
					use: 'node-loader',
					exclude: /node_modules/,
				},
			],
		},
		externals: [
			// Add any native modules you want to exclude from webpack processing
			{
				'../../build/Release/kyber_node_addon.node':
					'commonjs2 ../../build/Release/kyber_node_addon.node',
				'../build/Release/kyber_node_addon.node':
					'commonjs2 ../build/Release/kyber_node_addon.node',
				'./build/Release/kyber_node_addon.node':
					'commonjs2 ./build/Release/kyber_node_addon.node',
			},
			// Add any native Node.js modules here
			'fsevents',
		],
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'main.js',
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
		},
		// Add this to ignore warnings about critical dependencies
		ignoreWarnings: [
			{
				module: /kyber_node_addon/,
			},
			{
				message: /Critical dependency/,
			},
		],
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
