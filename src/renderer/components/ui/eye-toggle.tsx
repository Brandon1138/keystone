import React, { useRef } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { gsap } from 'gsap';

interface EyeToggleProps {
	isVisible: boolean;
	onToggle: () => void;
	isEnabled: boolean;
	appContentRef?: React.RefObject<HTMLDivElement>;
}

export const EyeToggle: React.FC<EyeToggleProps> = ({
	isVisible,
	onToggle,
	isEnabled,
	appContentRef,
}) => {
	const theme = useTheme();
	const isDarkMode = theme.palette.mode === 'dark';
	const toggleRef = useRef<HTMLDivElement>(null);

	if (!isEnabled) return null;

	const handleToggle = () => {
		if (!appContentRef?.current) {
			// If no ref is provided, just toggle normally
			onToggle();
			return;
		}

		// Create timeline for animation
		const timeline = gsap.timeline({
			defaults: { overwrite: 'auto' },
		});

		if (isVisible) {
			// Hide UI with animation - preserve backdrop-filter
			timeline.to(appContentRef.current, {
				opacity: 0,
				scale: 0.95,
				duration: 0.4,
				ease: 'power3.out',
				onComplete: () => {
					// Only call onToggle after animation completes
					onToggle();
				},
			});
		} else {
			// For showing, we call onToggle first to make element visible
			onToggle();

			// Then animate it in
			timeline.fromTo(
				appContentRef.current,
				{
					opacity: 0,
					scale: 0.95,
				},
				{
					opacity: 1,
					scale: 1,
					duration: 0.5,
					ease: 'power2.inOut',
				}
			);
		}
	};

	return (
		<Tooltip title={isVisible ? 'Hide UI' : 'Show UI'}>
			<IconButton
				onClick={handleToggle}
				size="small"
				disableRipple
				sx={{
					padding: 0,
					color: isDarkMode ? 'text-[#FAFAFA]' : 'text-[#131313]',
				}}
			>
				{isVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
			</IconButton>
		</Tooltip>
	);
};

export default EyeToggle;
