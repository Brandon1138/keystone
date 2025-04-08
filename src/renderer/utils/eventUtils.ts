/**
 * Simple event bus to manage application-wide events
 */

type EventHandler = (...args: any[]) => void;

interface EventBus {
	on(event: string, callback: EventHandler): void;
	off(event: string, callback: EventHandler): void;
	emit(event: string, ...args: any[]): void;
}

// Event types
export const EVENTS = {
	DATABASE_UPDATED: 'database_updated',
	FULLSCREEN_TOGGLE: 'fullscreen_toggle',
	RESIZE: 'resize',
};

class EventBusImpl implements EventBus {
	private events: Map<string, EventHandler[]>;

	constructor() {
		this.events = new Map();
	}

	/**
	 * Register an event handler
	 */
	on(event: string, callback: EventHandler): void {
		if (!this.events.has(event)) {
			this.events.set(event, []);
		}

		const handlers = this.events.get(event) || [];
		handlers.push(callback);
	}

	/**
	 * Remove an event handler
	 */
	off(event: string, callback: EventHandler): void {
		if (!this.events.has(event)) return;

		const handlers = this.events.get(event) || [];
		const index = handlers.indexOf(callback);

		if (index !== -1) {
			handlers.splice(index, 1);
		}
	}

	/**
	 * Emit an event to all registered handlers
	 */
	emit(event: string, ...args: any[]): void {
		if (!this.events.has(event)) return;

		const handlers = this.events.get(event) || [];
		handlers.forEach((handler) => {
			try {
				handler(...args);
			} catch (error) {
				console.error(`Error in event handler for ${event}:`, error);
			}
		});
	}
}

/**
 * Debounce function to limit how often a function can be called
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout | null = null;

	return function (this: any, ...args: Parameters<T>) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn.apply(this, args);
			timeoutId = null;
		}, delay);
	};
}

// Create a singleton instance
export const eventBus = new EventBusImpl();

// Helper function to notify about database updates
export const notifyDatabaseUpdated = (
	dataType?: 'benchmark' | 'quantum' | 'all'
) => {
	eventBus.emit(EVENTS.DATABASE_UPDATED, dataType || 'all');
};

// Helper function to notify about fullscreen toggle
export const notifyFullscreenToggle = () => {
	eventBus.emit(EVENTS.FULLSCREEN_TOGGLE);
};

// Helper function to notify about window resize
export const notifyResize = debounce(() => {
	eventBus.emit(EVENTS.RESIZE);
}, 250);

export default eventBus;
