import React, { useState } from 'react';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LinkIcon from '@mui/icons-material/Link';
import LaunchIcon from '@mui/icons-material/Launch';
import { useTheme } from '@mui/material/styles';
import {
	Button,
	Typography,
	Box,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Divider,
	Paper,
	Link as MuiLink,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Card } from '../components/ui/card';

/**
 * Codex Knowledge Base Component
 */
export const CodexPage: React.FC = () => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const [activeSection, setActiveSection] = useState<string>('standardization');

	// Interface for resource links
	interface ResourceLink {
		title: string;
		url: string;
		description: string;
	}

	// Data for sections
	const sections = {
		standardization: {
			title: 'PQC Standardization & Guidance',
			icon: <SettingsIcon style={{ color: '#9747FF' }} />,
			subsections: [
				{
					title: 'NIST PQC Standardization',
					links: [
						{
							title: 'NIST PQC Project',
							url: 'https://csrc.nist.gov/Projects/post-quantum-cryptography',
							description:
								'Official NIST Post-Quantum Cryptography project page',
						},
						{
							title: 'CRYSTALS-Kyber (ML-KEM)',
							url: 'https://csrc.nist.gov/pubs/fips/203/ipd',
							description: 'NIST FIPS 203 (Initial Public Draft) for ML-KEM',
						},
						{
							title: 'CRYSTALS-Dilithium (ML-DSA)',
							url: 'https://csrc.nist.gov/pubs/fips/204/ipd',
							description: 'NIST FIPS 204 (Initial Public Draft) for ML-DSA',
						},
						{
							title: 'SPHINCS+ (ML-DSA-HSS)',
							url: 'https://csrc.nist.gov/pubs/fips/205/ipd',
							description:
								'NIST FIPS 205 (Initial Public Draft) for ML-DSA-HSS',
						},
						{
							title: 'FALCON (ML-DSA-FO)',
							url: 'https://falcon-sign.info/',
							description:
								'Fast-Fourier Lattice-Based Compact Signatures over NTRU',
						},
						{
							title: 'NIST PQC Standardization Process Round 3 Report',
							url: 'https://csrc.nist.gov/publications/detail/nistir/8413/final',
							description:
								'Official report on Round 3 of the NIST PQC Standardization Process',
						},
					],
				},
				{
					title: 'Other Standards Bodies',
					links: [
						{
							title: 'ETSI Quantum-Safe Cryptography',
							url: 'https://www.etsi.org/committee/qsc',
							description: 'ETSI Quantum-Safe Cryptography Technical Committee',
						},
						{
							title: 'ISO/IEC JTC 1/SC 27 WG 2',
							url: 'https://www.iso.org/committee/45306.html',
							description:
								'ISO/IEC working group on cryptography and security mechanisms',
						},
						{
							title: 'IETF Crypto Forum Research Group',
							url: 'https://datatracker.ietf.org/rg/cfrg/about/',
							description:
								'IETF research group focused on cryptographic protocols',
						},
						{
							title: 'NIST Crypto Publication Status',
							url: 'https://csrc.nist.gov/publications/search?requestStatus=Final&requestSeries=FIPS',
							description: 'Current status of NIST cryptographic publications',
						},
					],
				},
			],
		},
		libraries: {
			title: 'PQC Libraries, Implementations & Tools',
			icon: <CodeIcon style={{ color: '#9747FF' }} />,
			subsections: [
				{
					title: 'Open Quantum Safe (OQS)',
					links: [
						{
							title: 'OQS Project',
							url: 'https://openquantumsafe.org/',
							description: 'Main Open Quantum Safe project page',
						},
						{
							title: 'liboqs GitHub',
							url: 'https://github.com/open-quantum-safe/liboqs',
							description:
								'C library for quantum-resistant cryptographic algorithms',
						},
						{
							title: 'OQS-OpenSSL',
							url: 'https://github.com/open-quantum-safe/openssl',
							description: 'Integration of liboqs with OpenSSL',
						},
						{
							title: 'OQS-BoringSSL',
							url: 'https://github.com/open-quantum-safe/boringssl',
							description: 'Integration of liboqs with BoringSSL',
						},
					],
				},
				{
					title: 'PQClean & Other Libraries',
					links: [
						{
							title: 'PQClean',
							url: 'https://github.com/PQClean/PQClean',
							description:
								'Clean, portable, tested implementations of post-quantum cryptography',
						},
						{
							title: 'Bouncy Castle',
							url: 'https://www.bouncycastle.org/',
							description: 'Java and C# library with PQC implementations',
						},
						{
							title: 'SUPERCOP',
							url: 'https://bench.cr.yp.to/supercop.html',
							description:
								'System for Unified Performance Evaluation Related to Cryptographic Operations and Primitives',
						},
						{
							title: 'pqcrypto',
							url: 'https://github.com/mupq/pqm4',
							description: 'Post-quantum cryptography for embedded devices',
						},
					],
				},
				{
					title: 'Benchmarking & Analysis Tools',
					links: [
						{
							title: 'NIST PQC Benchmarking',
							url: 'https://csrc.nist.gov/CSRC/media/Projects/post-quantum-cryptography/documents/call-for-proposals-final-dec-2016.pdf',
							description: 'NIST requirements and benchmarking criteria',
						},
						{
							title: 'PQCrypto-SIDH',
							url: 'https://github.com/microsoft/PQCrypto-SIDH',
							description:
								"Microsoft's implementation of supersingular isogeny Diffie-Hellman",
						},
						{
							title: 'PQShield',
							url: 'https://pqshield.com/resources/',
							description:
								'Resources on PQC implementations and security analysis',
						},
					],
				},
			],
		},
		quantum: {
			title: 'Quantum Computing Frameworks & Platforms',
			icon: <SchoolIcon style={{ color: '#9747FF' }} />,
			subsections: [
				{
					title: 'IBM Quantum',
					links: [
						{
							title: 'IBM Quantum',
							url: 'https://quantum-computing.ibm.com/',
							description: 'IBM Quantum Computing platform',
						},
						{
							title: 'Qiskit Documentation',
							url: 'https://qiskit.org/documentation/',
							description: 'Documentation for the Qiskit quantum SDK',
						},
						{
							title: 'Qiskit Textbook',
							url: 'https://qiskit.org/textbook/',
							description:
								'Interactive educational resource for quantum computing',
						},
					],
				},
				{
					title: 'Google Quantum & Microsoft Azure',
					links: [
						{
							title: 'Google Cirq',
							url: 'https://quantumai.google/cirq',
							description: "Google's quantum computing framework",
						},
						{
							title: 'Microsoft Quantum Development Kit',
							url: 'https://learn.microsoft.com/en-us/azure/quantum/',
							description: "Microsoft's quantum development platform",
						},
						{
							title: 'Azure Quantum',
							url: 'https://azure.microsoft.com/en-us/products/quantum',
							description: "Microsoft's cloud quantum computing service",
						},
					],
				},
				{
					title: 'Amazon & Other Platforms',
					links: [
						{
							title: 'Amazon Braket',
							url: 'https://aws.amazon.com/braket/',
							description: 'AWS quantum computing service',
						},
						{
							title: 'PennyLane',
							url: 'https://pennylane.ai/qml/',
							description:
								'Quantum machine learning and quantum computing framework',
						},
						{
							title: 'IonQ',
							url: 'https://ionq.com/developers',
							description: 'Ion-trap quantum computing platform',
						},
						{
							title: 'Quantinuum',
							url: 'https://www.quantinuum.com/developers',
							description: 'Quantum computing resources and access',
						},
					],
				},
			],
		},
		knowledge: {
			title: 'Foundational Knowledge & Research',
			icon: <LibraryBooksIcon style={{ color: '#9747FF' }} />,
			subsections: [
				{
					title: 'Quantum Threats & Algorithms',
					links: [
						{
							title: "Shor's Algorithm Explanation",
							url: 'https://quantum-computing.ibm.com/composer/docs/iqx/guide/shors-algorithm',
							description: "IBM Quantum explanation of Shor's algorithm",
						},
						{
							title: "Grover's Algorithm Explanation",
							url: 'https://quantum-computing.ibm.com/composer/docs/iqx/guide/grovers-algorithm',
							description: "IBM Quantum explanation of Grover's algorithm",
						},
						{
							title: 'Quantum Threat Timeline',
							url: 'https://globalriskinstitute.org/publications/quantum-threat-timeline/',
							description:
								"Global Risk Institute's assessment of the quantum threat timeline",
						},
					],
				},
				{
					title: 'PQC Concepts & Migration',
					links: [
						{
							title: 'Lattice-based Cryptography',
							url: 'https://csrc.nist.gov/CSRC/media/Events/Second-PQC-Standardization-Conference/documents/accepted-papers/moody-NIST-PQC-Stnd.pdf',
							description: 'Introduction to lattice-based cryptography',
						},
						{
							title: 'Crypto Agility',
							url: 'https://www.ncsc.gov.uk/whitepaper/preparing-for-quantum-safe-cryptography',
							description:
								'UK NCSC guidance on preparing for quantum-safe cryptography',
						},
						{
							title: 'NSA PQC Guidance',
							url: 'https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_COMMERCIAL_NATIONAL_SECURITY_ALGORITHM_2_0_20220907.PDF',
							description: 'NSA guidance on post-quantum cryptography',
						},
					],
				},
				{
					title: 'Research Repositories & Conferences',
					links: [
						{
							title: 'Cryptology ePrint Archive',
							url: 'https://eprint.iacr.org/',
							description: 'Repository for cryptographic research papers',
						},
						{
							title: 'arXiv Quantum Physics',
							url: 'https://arxiv.org/archive/quant-ph',
							description: 'Archive of quantum physics research papers',
						},
						{
							title: 'PQCrypto Conference',
							url: 'https://pqcrypto.org/',
							description:
								'International Conference on Post-Quantum Cryptography',
						},
						{
							title: 'Real World Crypto',
							url: 'https://rwc.iacr.org/',
							description: 'Annual workshop on real-world cryptography',
						},
					],
				},
			],
		},
	};

	// Render a single resource link
	const renderResourceLink = (link: ResourceLink) => (
		<ListItem
			key={link.title}
			sx={{
				py: 1.5,
				px: 2,
				transition: 'all 0.2s',
				borderRadius: '8px',
				'&:hover': {
					background: isDarkMode
						? 'rgba(151, 71, 255, 0.08)'
						: 'rgba(151, 71, 255, 0.05)',
				},
				mb: 1,
			}}
		>
			<ListItemIcon>
				<LinkIcon style={{ color: '#9747FF' }} />
			</ListItemIcon>
			<ListItemText
				primary={
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<MuiLink
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							sx={{
								color: isDarkMode ? '#BB86FC' : '#9747FF',
								fontWeight: 'medium',
								display: 'flex',
								alignItems: 'center',
								'&:hover': {
									textDecoration: 'underline',
								},
							}}
						>
							{link.title}
							<LaunchIcon
								fontSize="small"
								sx={{ ml: 0.5, fontSize: '0.875rem' }}
							/>
						</MuiLink>
					</Box>
				}
				secondary={link.description}
				primaryTypographyProps={{
					variant: 'subtitle1',
					component: 'div',
				}}
				secondaryTypographyProps={{
					variant: 'body2',
					color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
					sx: {
						fontWeight: 'medium',
						textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
					},
				}}
			/>
		</ListItem>
	);

	// Render a subsection with its links
	const renderSubsection = (
		sectionKey: string,
		subsection: { title: string; links: ResourceLink[] }
	) => (
		<Accordion
			key={subsection.title}
			defaultExpanded={true}
			sx={{
				backgroundColor: isDarkMode
					? 'rgba(42, 42, 42, 0.5)'
					: 'rgba(245, 245, 245, 0.5)',
				backdropFilter: 'blur(8px)',
				mb: 2,
				boxShadow: isDarkMode
					? '0 4px 15px rgba(0, 0, 0, 0.2)'
					: '0 4px 15px rgba(0, 0, 0, 0.1)',
				'&:before': {
					display: 'none',
				},
				'&.Mui-expanded': {
					margin: '0 0 16px',
				},
				borderRadius: '12px',
				border: '1px solid',
				borderColor: isDarkMode
					? 'rgba(255, 255, 255, 0.08)'
					: 'rgba(255, 255, 255, 0.5)',
				overflow: 'hidden',
			}}
		>
			<AccordionSummary
				expandIcon={<ExpandMoreIcon style={{ color: '#9747FF' }} />}
				sx={{
					borderBottom: '1px solid',
					borderColor: isDarkMode
						? 'rgba(255, 255, 255, 0.08)'
						: 'rgba(0, 0, 0, 0.08)',
					background: isDarkMode
						? 'rgba(42, 42, 42, 0.7)'
						: 'rgba(245, 245, 245, 0.7)',
				}}
			>
				<Typography
					variant="h6"
					sx={{
						color: isDarkMode ? '#ffffff' : '#000000',
						fontWeight: 'medium',
						fontSize: '1rem',
					}}
				>
					{subsection.title}
				</Typography>
			</AccordionSummary>
			<AccordionDetails
				sx={{
					p: 0,
					background: isDarkMode
						? 'rgba(33, 33, 33, 0.3)'
						: 'rgba(255, 255, 255, 0.3)',
				}}
			>
				<List disablePadding>
					{subsection.links.map((link) => renderResourceLink(link))}
				</List>
			</AccordionDetails>
		</Accordion>
	);

	// Render the content for the active section
	const renderSectionContent = (sectionKey: string) => {
		const section = sections[sectionKey as keyof typeof sections];

		return (
			<div>
				<Typography
					variant="h5"
					component="h2"
					sx={{
						color: isDarkMode ? '#ffffff' : '#000000',
						fontWeight: 'bold',
						mb: 3,
					}}
				>
					{section.title}
				</Typography>

				{section.subsections.map((subsection) =>
					renderSubsection(sectionKey, subsection)
				)}
			</div>
		);
	};

	return (
		<div className="container relative z-10 px-6 py-4">
			<div className="space-y-5">
				{/* Main Header Card */}
				<Card
					className={`p-6 mb-5 rounded-xl shadow-md transition-all ${
						isDarkMode ? '' : ''
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
						Your comprehensive resource hub for Post-Quantum Cryptography,
						quantum computing frameworks, implementation libraries, and
						research.
					</p>

					{/* Section selector */}
					<div className="flex flex-wrap gap-2 mt-2">
						<Button
							variant={
								activeSection === 'standardization' ? 'contained' : 'outlined'
							}
							onClick={() => setActiveSection('standardization')}
							sx={{
								bgcolor:
									activeSection === 'standardization'
										? '#9747FF'
										: 'transparent',
								borderColor: '#9747FF',
								color:
									activeSection === 'standardization'
										? '#FFFFFF'
										: isDarkMode
										? '#FFFFFF'
										: '#000000',
								'&:hover': {
									bgcolor:
										activeSection === 'standardization'
											? '#8030E0'
											: isDarkMode
											? 'rgba(151, 71, 255, 0.1)'
											: 'rgba(151, 71, 255, 0.1)',
									borderColor: '#9747FF',
								},
								fontSize: '0.85rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								height: '40px',
								display: 'flex',
								alignItems: 'center',
							}}
							startIcon={<SettingsIcon />}
						>
							Standards
						</Button>
						<Button
							variant={activeSection === 'libraries' ? 'contained' : 'outlined'}
							onClick={() => setActiveSection('libraries')}
							sx={{
								bgcolor:
									activeSection === 'libraries' ? '#9747FF' : 'transparent',
								borderColor: '#9747FF',
								color:
									activeSection === 'libraries'
										? '#FFFFFF'
										: isDarkMode
										? '#FFFFFF'
										: '#000000',
								'&:hover': {
									bgcolor:
										activeSection === 'libraries'
											? '#8030E0'
											: isDarkMode
											? 'rgba(151, 71, 255, 0.1)'
											: 'rgba(151, 71, 255, 0.1)',
									borderColor: '#9747FF',
								},
								fontSize: '0.85rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								height: '40px',
								display: 'flex',
								alignItems: 'center',
							}}
							startIcon={<CodeIcon />}
						>
							Libraries
						</Button>
						<Button
							variant={activeSection === 'quantum' ? 'contained' : 'outlined'}
							onClick={() => setActiveSection('quantum')}
							sx={{
								bgcolor:
									activeSection === 'quantum' ? '#9747FF' : 'transparent',
								borderColor: '#9747FF',
								color:
									activeSection === 'quantum'
										? '#FFFFFF'
										: isDarkMode
										? '#FFFFFF'
										: '#000000',
								'&:hover': {
									bgcolor:
										activeSection === 'quantum'
											? '#8030E0'
											: isDarkMode
											? 'rgba(151, 71, 255, 0.1)'
											: 'rgba(151, 71, 255, 0.1)',
									borderColor: '#9747FF',
								},
								fontSize: '0.85rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								height: '40px',
								display: 'flex',
								alignItems: 'center',
							}}
							startIcon={<SchoolIcon />}
						>
							Frameworks
						</Button>
						<Button
							variant={activeSection === 'knowledge' ? 'contained' : 'outlined'}
							onClick={() => setActiveSection('knowledge')}
							sx={{
								bgcolor:
									activeSection === 'knowledge' ? '#9747FF' : 'transparent',
								borderColor: '#9747FF',
								color:
									activeSection === 'knowledge'
										? '#FFFFFF'
										: isDarkMode
										? '#FFFFFF'
										: '#000000',
								'&:hover': {
									bgcolor:
										activeSection === 'knowledge'
											? '#8030E0'
											: isDarkMode
											? 'rgba(151, 71, 255, 0.1)'
											: 'rgba(151, 71, 255, 0.1)',
									borderColor: '#9747FF',
								},
								fontSize: '0.85rem',
								padding: '8px 16px',
								textTransform: 'uppercase',
								fontWeight: 'bold',
								borderRadius: '8px',
								height: '40px',
								display: 'flex',
								alignItems: 'center',
							}}
							startIcon={<LibraryBooksIcon />}
						>
							Knowledge
						</Button>
					</div>
				</Card>

				{/* Content Section */}
				<Card className={`p-6 rounded-xl shadow-md transition-all`}>
					{renderSectionContent(activeSection)}
				</Card>
			</div>
		</div>
	);
};

export default CodexPage;
