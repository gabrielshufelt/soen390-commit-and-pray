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
    
    expect(path).toBeNull();
  });

  it('allows non-accessible elevator when wheelchair accessibility is disabled', () => {
    const inaccessibleElevatorMock: FloorData[] = [
      {
        nodes: [
          { id: 'F1_A', label: 'A', type: 'room', floor: 1, x: 0, y: 0, accessible: true },
          { id: 'F1_E', label: '', type: 'elevator_door', floor: 1, x: 5, y: 5, accessible: false },
          { id: 'F2_E', label: '', type: 'elevator_door', floor: 2, x: 5, y: 5, accessible: false },
          { id: 'F2_B', label: 'B', type: 'room', floor: 2, x: 10, y: 10, accessible: true }
        ],
        edges: [
          { source: 'F1_A', target: 'F1_E', type: 'hallway', weight: 2, accessible: true },
          { source: 'F1_E', target: 'F2_E', type: 'elevator', weight: 1, accessible: false },
          { source: 'F2_E', target: 'F2_B', type: 'hallway', weight: 2, accessible: true }
        ]
      }
    ];

    const pathfinder = new IndoorPathfinder(inaccessibleElevatorMock);
    const path = pathfinder.findShortestPath('A', 'B', {
      wheelchairAccessible: false,
      avoidStairs: true,
      preferElevators: true,
    });

    expect(path).not.toBeNull();
    expect(path?.[0].id).toBe('F1_A');
    expect(path?.[path.length - 1].id).toBe('F2_B');
  });

  it('blocks non-accessible elevator when wheelchair accessibility is enabled', () => {
    const inaccessibleElevatorMock: FloorData[] = [
      {
        nodes: [
          { id: 'F1_A', label: 'A', type: 'room', floor: 1, x: 0, y: 0, accessible: true },
          { id: 'F1_E', label: '', type: 'elevator_door', floor: 1, x: 5, y: 5, accessible: false },
          { id: 'F2_E', label: '', type: 'elevator_door', floor: 2, x: 5, y: 5, accessible: false },
          { id: 'F2_B', label: 'B', type: 'room', floor: 2, x: 10, y: 10, accessible: true }
        ],
        edges: [
          { source: 'F1_A', target: 'F1_E', type: 'hallway', weight: 2, accessible: true },
          { source: 'F1_E', target: 'F2_E', type: 'elevator', weight: 1, accessible: false },
          { source: 'F2_E', target: 'F2_B', type: 'hallway', weight: 2, accessible: true }
        ]
      }
    ];

    const pathfinder = new IndoorPathfinder(inaccessibleElevatorMock);
    const path = pathfinder.findShortestPath('A', 'B', {
      wheelchairAccessible: true,
      avoidStairs: true,
      preferElevators: true,
    });

    expect(path).toBeNull();
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
