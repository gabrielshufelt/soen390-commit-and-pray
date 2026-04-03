import { POI_CATEGORIES } from './poiCategories';

export interface POI {
	id: string;
	name: string;
	address: string;
	distance: number;
	isOpen: boolean;
	rating?: number;
	latitude: number;
	longitude: number;
	source: 'study' | 'google';
	categoryLabel?: string;
	phoneNumber?: string;
	pricing?: string;
	photoUrl?: string;
	website?: string;
}

export interface POICategory {
	title: string;
	icon: string;
	pois: POI[];
	isLoading: boolean;
	error?: string;
}

export interface CacheEntry {
	pois: POI[];
	timestamp: number;
	latitude: number;
	longitude: number;
}

export interface Coordinates {
	latitude: number;
	longitude: number;
}

export type CategoryKey = keyof typeof POI_CATEGORIES;

export interface StudySpaceConfig {
	id: string;
	code: string;
	name: string;
	address: string;
	openHour: number;
	closeHour: number;
	openDays: number[];
}

export interface GooglePlacesNearbyResult {
	place_id: string;
	name: string;
	vicinity?: string;
	rating?: number;
	geometry?: {
		location?: {
			lat?: number;
			lng?: number;
		};
	};
	opening_hours?: {
		open_now?: boolean;
	};
}

export interface GooglePlacesNearbyResponse {
	status: string;
	results?: GooglePlacesNearbyResult[];
	error_message?: string;
}

export interface GooglePlaceDetailsResponse {
	status: string;
	error_message?: string;
	result?: {
		formatted_address?: string;
		formatted_phone_number?: string;
		international_phone_number?: string;
		price_level?: number;
		website?: string;
		photos?: Array<{
			photo_reference?: string;
		}>;
	};
}

export type CategoryFetchResult =
	| { categoryKey: string; pois: POI[] }
	| { categoryKey: string; error: string };
