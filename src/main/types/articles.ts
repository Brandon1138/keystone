// Types for articles (used in lowdbService)

export interface Article {
	id: string;
	title: string;
	content: string;
	date: string;
	[key: string]: any;
}

export interface RssFeed {
	id: string;
	url: string;
	name: string;
	lastFetched?: string;
	[key: string]: any;
}

// Add default properties for article and feed creation
export const defaultArticle = {
	title: 'No Title',
	content: 'No Content',
	date: new Date().toISOString(),
};

export const defaultRssFeed = {
	url: 'https://example.com',
	name: 'Default Feed',
};
