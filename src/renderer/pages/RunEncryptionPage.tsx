import React from 'react';
import { EncryptionRunner } from '../components/EncryptionRunner';

/**
 * Run Encryption Page Component
 */
export const RunEncryptionPage: React.FC = () => {
	return (
		<div className="container relative z-10 px-6 py-4">
			<EncryptionRunner />
		</div>
	);
};

export default RunEncryptionPage;
