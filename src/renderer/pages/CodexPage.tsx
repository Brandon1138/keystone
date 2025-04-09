import React, { useState } from 'react';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import ArticleIcon from '@mui/icons-material/Article';
import { useTheme } from '@mui/material/styles';
import { Button, Typography, Box, Grid } from '@mui/material';
import { Card } from '../components/ui/card';

/**
 * Codex Knowledge Base Component
 */
export const CodexPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [activeSection, setActiveSection] = useState<string>('articles');

	return (
		<div className="container relative z-10 px-6 py-4">
			<div className="space-y-5">
				{/* Main Header Card */}
				<Card
					className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
						isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
					}`}
				>
					<div className="flex items-center mb-4">
						<MenuBookIcon style={{ color: '#9747FF' }} className="mr-3" />
						<h2
							className="text-[20px] font-semibold"
							style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
						>
							Cryptographic Codex
						</h2>
					</div>
					<p
						className="mb-5"
						style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
					>
						Your knowledge hub for Post-Quantum Cryptography, quantum threats,
						and the evolving landscape of cryptographic security.
					</p>

					{/* Section selector */}
					<div className="flex space-x-4">
						<Button
							variant="contained"
							disableElevation
							onClick={() => setActiveSection('articles')}
							sx={{
								bgcolor: activeSection === 'articles' ? '#9747FF' : '#6B7280',
								'&:hover': {
									bgcolor: activeSection === 'articles' ? '#8030E0' : '#4B5563',
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								color: 'white',
							}}
						>
							Articles
						</Button>
						<Button
							variant="contained"
							disableElevation
							onClick={() => setActiveSection('library')}
							sx={{
								bgcolor: activeSection === 'library' ? '#9747FF' : '#6B7280',
								'&:hover': {
									bgcolor: activeSection === 'library' ? '#8030E0' : '#4B5563',
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								color: 'white',
							}}
						>
							Library
						</Button>
						<Button
							variant="contained"
							disableElevation
							onClick={() => setActiveSection('news')}
							sx={{
								bgcolor: activeSection === 'news' ? '#9747FF' : '#6B7280',
								'&:hover': {
									bgcolor: activeSection === 'news' ? '#8030E0' : '#4B5563',
								},
								fontSize: '0.9rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								color: 'white',
							}}
						>
							News
						</Button>
					</div>
				</Card>

				{/* Articles Section */}
				{activeSection === 'articles' && (
					<Card
						className={`p-6 rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-4">
							<ArticleIcon style={{ color: '#9747FF' }} className="mr-3" />
							<h2
								className="text-[20px] font-semibold"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Featured Articles
							</h2>
						</div>

						<div className="border border-border/40 dark:border-border-dark/40 rounded-lg p-5 h-96 flex items-center justify-center bg-muted/30 dark:bg-muted-dark/30">
							<div className="text-center">
								<ArticleIcon className="h-24 w-24 mx-auto text-muted-foreground/50 dark:text-muted-foreground-dark/50" />
								<p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground-dark">
									Articles about quantum threats and PQC will appear here
								</p>
							</div>
						</div>
					</Card>
				)}

				{/* Library Section */}
				{activeSection === 'library' && (
					<Card
						className={`p-6 rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-4">
							<MenuBookIcon style={{ color: '#9747FF' }} className="mr-3" />
							<h2
								className="text-[20px] font-semibold"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								PQC Schemes Library
							</h2>
						</div>

						<div className="border border-border/40 dark:border-border-dark/40 rounded-lg p-5 h-96 flex items-center justify-center bg-muted/30 dark:bg-muted-dark/30">
							<div className="text-center">
								<MenuBookIcon className="h-24 w-24 mx-auto text-muted-foreground/50 dark:text-muted-foreground-dark/50" />
								<p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground-dark">
									Detailed information about PQC schemes will appear here
								</p>
							</div>
						</div>
					</Card>
				)}

				{/* News Section */}
				{activeSection === 'news' && (
					<Card
						className={`p-6 rounded-xl shadow-md transition-all ${
							isDarkMode ? 'bg-[#212121]' : 'bg-[#E9E9E9]'
						}`}
					>
						<div className="flex items-center mb-4">
							<RssFeedIcon style={{ color: '#9747FF' }} className="mr-3" />
							<h2
								className="text-[20px] font-semibold"
								style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
							>
								Latest PQC News
							</h2>
						</div>

						<div className="border border-border/40 dark:border-border-dark/40 rounded-lg p-5 h-96 flex items-center justify-center bg-muted/30 dark:bg-muted-dark/30">
							<div className="text-center">
								<RssFeedIcon className="h-24 w-24 mx-auto text-muted-foreground/50 dark:text-muted-foreground-dark/50" />
								<p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground-dark">
									Latest news from specialized RSS feeds will appear here
								</p>
							</div>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
};

export default CodexPage;
