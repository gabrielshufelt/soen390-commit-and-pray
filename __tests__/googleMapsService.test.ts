import { fetchOutdoorRoute } from '../utils/googleMapsService';

global.fetch = jest.fn();

describe('googleMapsService', () => {
  const mockStart = { latitude: 45.4972, longitude: -73.579 };
  const mockEnd = { latitude: 45.495, longitude: -73.577 };
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchOutdoorRoute', () => {
    it('successfully fetches outdoor route and returns formatted steps', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: 'Head south',
                    distance: { text: '150 m' },
                    maneuver: 'straight',
                    start_location: { lat: 45.4972, lng: -73.579 },
                  },
                  {
                    html_instructions: 'Turn right',
                    distance: { text: '200 m' },
                    maneuver: 'turn-right',
                    start_location: { lat: 45.496, lng: -73.577 },
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'WALKING', mockApiKey);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        instruction: 'Head south',
        distance: '150 m',
        source: 'outdoor',
        maneuver: 'straight',
        coordinates: { latitude: 45.4972, longitude: -73.579 },
      });
      expect(result[1]).toEqual({
        instruction: 'Turn right',
        distance: '200 m',
        source: 'outdoor',
        maneuver: 'turn-right',
        coordinates: { latitude: 45.496, longitude: -73.577 },
      });
    });

    it('constructs correct URL with coordinates and mode', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [{ legs: [{ steps: [] }] }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain(`origin=${mockStart.latitude},${mockStart.longitude}`);
      expect(callUrl).toContain(`destination=${mockEnd.latitude},${mockEnd.longitude}`);
      expect(callUrl).toContain('mode=driving');
      expect(callUrl).toContain(`key=${mockApiKey}`);
    });

    it('uses lowercase mode in URL', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [{ legs: [{ steps: [] }] }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await fetchOutdoorRoute(mockStart, mockEnd, 'TRANSIT', mockApiKey);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('mode=transit');
    });

    it('handles default maneuver value when not provided', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: 'Continue',
                    distance: { text: '100 m' },
                    start_location: { lat: 45.5, lng: -73.58 },
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'WALKING', mockApiKey);

      expect(result[0].maneuver).toBe('straight');
    });

    it('throws error when API returns non-OK status', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS',
        routes: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await expect(
        fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey)
      ).rejects.toThrow('Google Maps API Error: ZERO_RESULTS');
    });

    it('throws error for OVER_QUERY_LIMIT status', async () => {
      const mockResponse = {
        status: 'OVER_QUERY_LIMIT',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await expect(
        fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey)
      ).rejects.toThrow('Google Maps API Error: OVER_QUERY_LIMIT');
    });

    it('throws error for REQUEST_DENIED status', async () => {
      const mockResponse = {
        status: 'REQUEST_DENIED',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await expect(
        fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey)
      ).rejects.toThrow('Google Maps API Error: REQUEST_DENIED');
    });

    it('handles network errors from fetch', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey)
      ).rejects.toThrow('Network error');
    });

    it('handles multiple steps in response', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: 'Head north',
                    distance: { text: '100 m' },
                    maneuver: 'straight',
                    start_location: { lat: 45.5, lng: -73.58 },
                  },
                  {
                    html_instructions: 'Turn left onto Main St',
                    distance: { text: '250 m' },
                    maneuver: 'turn-left',
                    start_location: { lat: 45.51, lng: -73.58 },
                  },
                  {
                    html_instructions: 'Arrive at destination',
                    distance: { text: '0 m' },
                    maneuver: 'straight',
                    start_location: { lat: 45.515, lng: -73.58 },
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'WALKING', mockApiKey);

      expect(result).toHaveLength(3);
      expect(result.map(s => s.instruction)).toEqual([
        'Head north',
        'Turn left onto Main St',
        'Arrive at destination',
      ]);
    });

    it('preserves HTML instructions as-is', async () => {
      const htmlInstruction = 'Head <b>south</b> on <a href="#">Main St</a>';
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: htmlInstruction,
                    distance: { text: '100 m' },
                    start_location: { lat: 45.5, lng: -73.58 },
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'DRIVING', mockApiKey);

      expect(result[0].instruction).toBe(htmlInstruction);
    });

    it('handles floating point coordinate precision', async () => {
      const preciseCoords = { lat: 45.49724123456, lng: -73.57890987654 };
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: 'Step 1',
                    distance: { text: '50 m' },
                    start_location: preciseCoords,
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'WALKING', mockApiKey);

      expect(result[0].coordinates).toEqual({
        latitude: preciseCoords.lat,
        longitude: preciseCoords.lng,
      });
    });

    it('all steps have source set to outdoor', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [
          {
            legs: [
              {
                steps: [
                  {
                    html_instructions: 'Step 1',
                    distance: { text: '50 m' },
                    start_location: { lat: 45.5, lng: -73.58 },
                  },
                  {
                    html_instructions: 'Step 2',
                    distance: { text: '75 m' },
                    start_location: { lat: 45.51, lng: -73.57 },
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchOutdoorRoute(mockStart, mockEnd, 'WALKING', mockApiKey);

      expect(result.every(step => step.source === 'outdoor')).toBe(true);
    });
  });
});
