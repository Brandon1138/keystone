const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
				// Kyber addon paths
				'../../build/Release/kyber_node_addon.node':
					'commonjs2 ../../build/Release/kyber_node_addon.node',
				'../build/Release/kyber_node_addon.node':
					'commonjs2 ../build/Release/kyber_node_addon.node',
				'./build/Release/kyber_node_addon.node':
					'commonjs2 ./build/Release/kyber_node_addon.node',
				// Absolute paths to Kyber addon
				[path.resolve(
					__dirname,
					'addons/build/Release/kyber_node_addon.node'
				)]: `commonjs2 ${path.resolve(
					__dirname,
					'addons/build/Release/kyber_node_addon.node'
				)}`,

				// Dilithium addon paths
				'../../build/Release/dilithium_node_addon.node':
					'commonjs2 ../../build/Release/dilithium_node_addon.node',
				'../build/Release/dilithium_node_addon.node':
					'commonjs2 ../build/Release/dilithium_node_addon.node',
				'./build/Release/dilithium_node_addon.node':
					'commonjs2 ./build/Release/dilithium_node_addon.node',
				// Absolute paths to Dilithium addon
				[path.resolve(
					__dirname,
					'addons/build/Release/dilithium_node_addon.node'
				)]: `commonjs2 ${path.resolve(
					__dirname,
					'addons/build/Release/dilithium_node_addon.node'
				)}`,
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
				module: /dilithium_node_addon/,
			},
			{
				message: /Critical dependency/,
			},
		],
		// Disable node polyfills for native modules
		node: {
			__dirname: false,
			__filename: false,
		},
		plugins: [
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'public',
						to: '.',
					},
				],
			}),
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
			// Add an alias for Three.js to ensure a single instance is used
			alias: {
				three: path.resolve(__dirname, 'node_modules/three'),
			},
		},
	},
];
