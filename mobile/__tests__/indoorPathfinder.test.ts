import { IndoorPathfinder, FloorData } from '../utils/indoorPathfinder';
import { AllCampusData } from '../data/buildings';

// Keeping mock data to ensure core logic remains sound even if JSONs are modified
const mockData: FloorData[] = [
  {
    nodes: [
      { id: 'H1_110', label: '110', type: 'room', floor: 1, x: 0, y: 0, accessible: true },
      { id: 'H1_E', label: '', type: 'elevator_door', floor: 1, x: 10, y: 10, accessible: true }
    ],
    edges: [
      { source: 'H1_110', target: 'H1_E', type: 'hallway', weight: 10, accessible: true },
      { source: 'H1_E', target: 'H2_E', type: 'elevator', weight: 0, accessible: true }
    ]
  },
  {
    nodes: [
      { id: 'H2_E', label: '', type: 'elevator_door', floor: 2, x: 10, y: 10, accessible: true },
      { id: 'H2_201', label: '201', type: 'room', floor: 2, x: 20, y: 20, accessible: true }
    ],
    edges: [
      { source: 'H2_E', target: 'H2_201', type: 'hallway', weight: 10, accessible: true }
    ]
  }
];

describe('IndoorPathfinder Logic Tests', () => {
  it('successfully finds path across floors via elevator (Mock Data)', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = pathfinder.findShortestPath('110', '201');
    
    expect(path).not.toBeNull();
    expect(path).toHaveLength(4);
    expect(path?.[0].id).toBe('H1_110');
    expect(path?.[3].id).toBe('H2_201');
  });

  it('blocks paths using stairs (Infinity weight check)', () => {
    const stairMock: FloorData[] = [{
      nodes: [
        { id: 'start', label: 'Start', type: 'room', floor: 1, x: 0, y: 0, accessible: true },
        { id: 'end', label: 'End', type: 'room', floor: 2, x: 0, y: 0, accessible: true }
      ],
      edges: [
        { source: 'start', target: 'end', type: 'stair', weight: 5, accessible: true }
      ]
    }];
    
    const pathfinder = new IndoorPathfinder(stairMock);
    const path = pathfinder.findShortestPath('Start', 'End');
    
    expect(path).toHaveLength(0);
  });
});

describe('IndoorPathfinder Integration Tests (Real Data)', () => {
  const pathfinder = new IndoorPathfinder(AllCampusData as any);

  it('successfully finds a multi-floor path using Hall building JSONs', () => {
    const path = pathfinder.findShortestPath('110', '290');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('navigates within MB (John Molson) Floor 1', () => {
    const path = pathfinder.findShortestPath('1.210', '1.294');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('navigates within CC (Central Campus) Floor 1', () => {
    const path = pathfinder.findShortestPath('124', '120');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('navigates through VL (Vanier Library) Floor 1', () => {
    // Changed to 102 -> 122 because 101-3 has an empty label in the JSON
    const path = pathfinder.findShortestPath('102', '122');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });
});
