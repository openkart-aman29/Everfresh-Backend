// Turns shared coordinates into a human-readable address.
//
// Called once per enquiry, at ingest, so a lead that nobody opens costs nothing
// and an admin opening the same lead twice does not spend a second lookup.
//
// Every failure path returns null rather than throwing. A lead is worth far
// more than its address label, so a missing key, a slow provider or a quota
// breach must never cost us the enquiry.

import { GOOGLE_MAPS_API_KEY } from '@/configurations/ENV_Configuration';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const geocodeLogger = createFeatureLogger('Geocoding');

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

/** Google is usually well under a second; past this the enquiry waits too long. */
const TIMEOUT_MS = 4000;

interface GoogleGeocodeResponse {
    status: string;
    error_message?: string;
    results?: Array<{ formatted_address?: string }>;
}

/** Universal maps link: opens the native app on a phone, the web map elsewhere. */
export const googleMapsUrl = (latitude: number, longitude: number): string =>
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

export interface ReverseGeocodeResult {
    formattedAddress: string;
    geocodedAt: Date;
}

/**
 * Resolves `latitude`/`longitude` to a formatted address, or null when it
 * cannot be resolved for any reason.
 */
export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<ReverseGeocodeResult | null> => {
    if (!GOOGLE_MAPS_API_KEY) {
        geocodeLogger.warn('GOOGLE_MAPS_API_KEY not set - skipping reverse geocode', {
            action: 'REVERSE_GEOCODE',
        });
        return null;
    }

    const url = new URL(GEOCODE_ENDPOINT);
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'en');

    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

        if (!response.ok) {
            geocodeLogger.warn('Reverse geocode HTTP failure', {
                action: 'REVERSE_GEOCODE',
                httpStatus: response.status,
            });
            return null;
        }

        const body = (await response.json()) as GoogleGeocodeResponse;

        // ZERO_RESULTS is an ordinary outcome over water or open desert, so it
        // is logged at info. The rest point at our configuration or quota and
        // need an operator's attention.
        if (body.status !== 'OK') {
            const detail = {
                action: 'REVERSE_GEOCODE',
                providerStatus: body.status,
                providerMessage: body.error_message ?? null,
            };

            if (body.status === 'ZERO_RESULTS') {
                geocodeLogger.info('Reverse geocode found no address there', detail);
            } else {
                geocodeLogger.error('Reverse geocode rejected the request', detail);
            }

            return null;
        }

        const formattedAddress = body.results?.[0]?.formatted_address?.trim();

        if (!formattedAddress) {
            geocodeLogger.info('Reverse geocode succeeded with an empty address', {
                action: 'REVERSE_GEOCODE',
            });
            return null;
        }

        return { formattedAddress, geocodedAt: new Date() };
    } catch (error) {
        // Includes the AbortSignal timeout and any DNS or TLS failure.
        geocodeLogger.warn('Reverse geocode call failed', { action: 'REVERSE_GEOCODE', error });
        return null;
    }
};
