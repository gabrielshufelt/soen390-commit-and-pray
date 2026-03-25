import { getStitchedRoute, type CombinedNavigationStep } from '../utils/routeAggregator';
import { parseBuildingLocation } from '../utils/buildingParser';
import { getBuildingCoordinate } from '../utils/buildingCoordinates';
import { IndoorPathfinder } from '../utils/indoorPathfinder';
import { getDistanceMeters } from '../utils/geometry';

jest.mock('../utils/buildingParser');
jest.mock('../utils/buildingCoordinates');
jest.mock('../utils/geometry');
jest.mock('../data/buildings', () => ({
  AllCampusData: [
    {
      meta: { buildingId: 'BA' },
      nodes: [
        {
          type: 'building_entry',
          label: 'BA_ENTRY',
          buildingId: 'BA',
          floor: 1,
          latitude: 45.4972,
          longitude: -73.579,
        },
      ],
    },
    {
      meta: { buildingId: 'MB' },
      nodes: [
        {
          type: 'building_entry',
          label: 'MB_S2',
          buildingId: 'MB',
          floor: -2,
          latitude: 45.5001,
          longitude: -73.5821,
        },
        {
          type: 'building_entry',
          label: 'MB_MAIN',
          buildingId: 'MB',
          floor: 1,
          latitude: 45.5002,
          longitude: -73.5822,
        },
      ],
    },
  ],
}));

const mockedParseBuildingLocation = jest.mocked(parseBuildingLocation);
const mockedGetBuildingCoordinate = jest.mocked(getBuildingCoordinate);
const mockedGetDistanceMeters = jest.mocked(getDistanceMeters);
const mockedFindShortestPath = jest.spyOn(IndoorPathfinder.prototype, 'findShortestPath');

describe('routeAggregator - getStitchedRoute', () => {
  const mockUserLocation = { latitude: 45.4972, longitude: -73.579 };
  const mockBuildingBCoord = { latitude: 45.495, longitude: -73.577 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindShortestPath.mockReset();
  });

  describe('invalid inputs', () => {
    it('returns empty array when destination parsing fails', async () => {
      mockedParseBuildingLocation.mockReturnValueOnce(null);
      const mockFetchOutdoor = jest.fn();

      const result = await getStitchedRoute(
        'Building A',
        'Invalid Location',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(result).toEqual([]);
      expect(mockFetchOutdoor).not.toHaveBeenCalled();
    });

    it('throws error when fetchOutdoor is not provided', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      await expect(
        getStitchedRoute(
          'Building A',
          'Building B',
          false,
          'DRIVING',
          mockUserLocation,
          undefined as any
        )
      ).rejects.toThrow();
    });
  });

  describe('outdoor-only route', () => {
    it('returns only outdoor steps when no rooms specified', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockOutdoorSteps: CombinedNavigationStep[] = [
        {
          instruction: 'Head south',
          distance: '200m',
          source: 'outdoor',
          coordinates: mockUserLocation,
          maneuver: 'straight',
        },
      ];

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce(mockOutdoorSteps);

      const result = await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(result).toEqual(mockOutdoorSteps);
      expect(result.every(step => step.source === 'outdoor')).toBe(true);
    });

    it('calls fetchOutdoorSteps with building coordinates', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(mockFetchOutdoor).toHaveBeenCalledWith(
        mockUserLocation,
        expect.objectContaining({
          latitude: mockBuildingBCoord.latitude,
          longitude: mockBuildingBCoord.longitude,
          transportMode: 'DRIVING',
        })
      );
    });
  });

  describe('route assembly and outdoor portions', () => {
    it('includes getBuildingCoordinate in outdoor route call', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockOutdoorSteps = [
        {
          instruction: 'Head to destination',
          distance: '200m',
          source: 'outdoor',
          coordinates: mockUserLocation,
        },
      ];

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce(mockOutdoorSteps);

      const result = await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(mockedGetBuildingCoordinate).toHaveBeenCalledWith('BB');
      expect(result).toContainEqual(expect.objectContaining({
        source: 'outdoor',
      }));
    });

    it('returns combined route with outdoor steps', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockOutdoorSteps = [
        {
          instruction: 'Step 1',
          distance: '100m',
          source: 'outdoor',
          coordinates: { latitude: 45.5, longitude: -73.58 },
        },
        {
          instruction: 'Step 2',
          distance: '150m',
          source: 'outdoor',
          coordinates: { latitude: 45.496, longitude: -73.577 },
        },
      ];

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce(mockOutdoorSteps);

      const result = await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'WALKING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockOutdoorSteps);
    });

    it('passes transport mode to fetchOutdoor callback', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'WALKING',
        mockUserLocation,
        mockFetchOutdoor
      );

      // Verify the callback was called with the correct parameters
      expect(mockFetchOutdoor).toHaveBeenCalled();
      const callArgs = mockFetchOutdoor.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('transportMode', 'WALKING');
    });

    it('adds indoor exit steps when origin includes a room', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '101' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      mockedFindShortestPath.mockReturnValueOnce([
        { buildingId: 'BA', floor: 1, latitude: 45.4972, longitude: -73.579 },
      ] as any);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      const result = await getStitchedRoute(
        'Building A Room 101',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(result.some(step => step.source === 'indoor')).toBe(true);
      expect(result[0].instruction).toContain('Exit BA via BA_ENTRY');
      expect(mockedFindShortestPath).toHaveBeenCalledWith('101', 'BA_ENTRY', false);
    });

    it('adds indoor arrival steps when destination includes a room', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'MB', buildingName: 'MB', room: 'S261' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce({ latitude: 45.5, longitude: -73.58 });

      mockedFindShortestPath.mockReturnValueOnce([
        { buildingId: 'MB', floor: -2, latitude: 45.5001, longitude: -73.5821 },
      ] as any);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      const result = await getStitchedRoute(
        'Building A',
        'MB Room S261',
        true,
        'TRANSIT',
        mockUserLocation,
        mockFetchOutdoor
      );

      const lastStep = result[result.length - 1];
      expect(lastStep.instruction).toBe('Head to S261');
      expect(lastStep.source).toBe('indoor');
      expect(mockedFindShortestPath).toHaveBeenCalledWith('MB_S2', 'S261', true);
    });

    it('maps both indoor legs when origin and destination both include rooms', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '101' };
      const mockDest = { buildingCode: 'MB', buildingName: 'MB', room: 'S261' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce({ latitude: 45.5, longitude: -73.58 });

      mockedFindShortestPath
        .mockReturnValueOnce([
          { buildingId: 'BA', floor: 1, latitude: 45.4972, longitude: -73.579 },
        ] as any)
        .mockReturnValueOnce([
          { buildingId: 'MB', floor: -2, latitude: 45.5001, longitude: -73.5821 },
        ] as any);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([
        {
          instruction: 'Walk to MB',
          distance: '300m',
          source: 'outdoor',
          coordinates: { latitude: 45.499, longitude: -73.581 },
        },
      ]);

      const result = await getStitchedRoute(
        'Building A Room 101',
        'MB Room S261',
        false,
        'TRANSIT',
        mockUserLocation,
        mockFetchOutdoor
      );

      const indoorSteps = result.filter(step => step.source === 'indoor');
      const outdoorSteps = result.filter(step => step.source === 'outdoor');

      expect(indoorSteps.length).toBeGreaterThanOrEqual(2);
      expect(outdoorSteps).toHaveLength(1);
      expect(indoorSteps[0].instruction).toContain('Exit BA via BA_ENTRY');
      expect(indoorSteps[indoorSteps.length - 1].instruction).toBe('Head to S261');
      expect(mockedFindShortestPath).toHaveBeenNthCalledWith(1, '101', 'BA_ENTRY', false);
      expect(mockedFindShortestPath).toHaveBeenNthCalledWith(2, 'MB_S2', 'S261', false);
    });

    it('uses MB S2 entry when transport mode is TRANSIT', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'MB', buildingName: 'MB', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce({ latitude: 0, longitude: 0 });

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'MB',
        false,
        'TRANSIT',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(mockFetchOutdoor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          latitude: 45.5001,
          longitude: -73.5821,
          transportMode: 'TRANSIT',
        })
      );
    });

    it('uses distance sort for MB entry when not TRANSIT', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'MB', buildingName: 'MB', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce({ latitude: 0, longitude: 0 });
      mockedGetDistanceMeters.mockReturnValueOnce(30).mockReturnValueOnce(10);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'MB',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      const destinationArg = mockFetchOutdoor.mock.calls[0][1];
      expect(destinationArg.transportMode).toBe('DRIVING');
      expect([45.5001, 45.5002]).toContain(destinationArg.latitude);
      expect([-73.5821, -73.5822]).toContain(destinationArg.longitude);
      expect(mockedGetDistanceMeters).toHaveBeenCalled();
    });
  });

  describe('transport modes', () => {
    it('supports DRIVING mode', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await expect(
        getStitchedRoute(
          'Building A',
          'Building B',
          false,
          'DRIVING',
          mockUserLocation,
          mockFetchOutdoor
        )
      ).resolves.toBeDefined();

      expect(mockFetchOutdoor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transportMode: 'DRIVING' })
      );
    });

    it('supports WALKING mode', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await expect(
        getStitchedRoute(
          'Building A',
          'Building B',
          false,
          'WALKING',
          mockUserLocation,
          mockFetchOutdoor
        )
      ).resolves.toBeDefined();

      expect(mockFetchOutdoor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transportMode: 'WALKING' })
      );
    });

    it('supports TRANSIT mode', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await expect(
        getStitchedRoute(
          'Building A',
          'Building B',
          false,
          'TRANSIT',
          mockUserLocation,
          mockFetchOutdoor
        )
      ).resolves.toBeDefined();

      expect(mockFetchOutdoor).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transportMode: 'TRANSIT' })
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('returns empty array when fetchOutdoor returns empty', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      const result = await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(result).toEqual([]);
    });

    it('propagates fetchOutdoor errors', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockError = new Error('Network failure');
      const mockFetchOutdoor = jest.fn().mockRejectedValueOnce(mockError);

      await expect(
        getStitchedRoute(
          'Building A',
          'Building B',
          false,
          'DRIVING',
          mockUserLocation,
          mockFetchOutdoor
        )
      ).rejects.toThrow('Network failure');
    });

    it('handles the case when origin and destination are the same building', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BA', buildingName: 'Building A', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockUserLocation);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      const result = await getStitchedRoute(
        'Building A',
        'Building A',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(Array.isArray(result)).toBe(true);
      expect(mockFetchOutdoor).toHaveBeenCalled();
    });

    it('handles null getBuildingCoordinate result', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(null);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      const result = await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('handles accessible flag correctly', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'Building B',
        true,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor
      );

      
      expect(mockFetchOutdoor).toHaveBeenCalled();
    });

    it('handles multiple sequential calls', async () => {
      const mockOrigin = { buildingCode: 'BA', buildingName: 'Building A', room: '' };
      const mockDest = { buildingCode: 'BB', buildingName: 'Building B', room: '' };

     
      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor1 = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'DRIVING',
        mockUserLocation,
        mockFetchOutdoor1
      );

      
      mockedParseBuildingLocation.mockReturnValueOnce(mockOrigin);
      mockedParseBuildingLocation.mockReturnValueOnce(mockDest);
      mockedGetBuildingCoordinate.mockReturnValueOnce(mockBuildingBCoord);

      const mockFetchOutdoor2 = jest.fn().mockResolvedValueOnce([]);

      await getStitchedRoute(
        'Building A',
        'Building B',
        false,
        'WALKING',
        mockUserLocation,
        mockFetchOutdoor2
      );

      
      expect(mockFetchOutdoor1).toHaveBeenCalled();
      expect(mockFetchOutdoor2).toHaveBeenCalled();
    });
  });
});
