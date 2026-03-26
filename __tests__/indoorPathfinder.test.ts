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

  it('returns null for blank start reference after trimming', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = pathfinder.findShortestPath('   ', '201');

    expect(path).toBeNull();
  });

  it('returns null when the start reference does not resolve by id or label', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = pathfinder.findShortestPath('DOES_NOT_EXIST', '201');

    expect(path).toBeNull();
  });

  it('resolves node references by trimmed label', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = pathfinder.findShortestPath(' 110 ', ' 201 ');

    expect(path).not.toBeNull();
    expect(path?.[0].label).toBe('110');
    expect(path?.[path.length - 1].label).toBe('201');
  });

  it('returns null when start and end are in different buildings', () => {
    const crossBuildingMock: FloorData[] = [
      {
        nodes: [
          { id: 'A1', label: 'A1', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'A', accessible: true },
          { id: 'B1', label: 'B1', type: 'room', floor: 1, x: 5, y: 0, buildingId: 'B', accessible: true },
        ],
        edges: [
          { source: 'A1', target: 'B1', type: 'hallway', weight: 1, accessible: true },
        ],
      },
    ];

    const pathfinder = new IndoorPathfinder(crossBuildingMock);
    const path = pathfinder.findShortestPath('A1', 'B1');

    expect(path).toBeNull();
  });

  it('returns null when end reference cannot be resolved', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = pathfinder.findShortestPath('110', 'MISSING_END');

    expect(path).toBeNull();
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

  it('blocks stair edges when preferElevators is enabled even if avoidStairs is false', () => {
    const stairOnlyMock: FloorData[] = [
      {
        nodes: [
          { id: 'S', label: 'Start', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'H', accessible: true },
          { id: 'E', label: 'End', type: 'room', floor: 2, x: 5, y: 5, buildingId: 'H', accessible: true },
        ],
        edges: [
          { source: 'S', target: 'E', type: 'stair', weight: 1, accessible: true },
        ],
      },
    ];

    const pathfinder = new IndoorPathfinder(stairOnlyMock);
    const path = pathfinder.findShortestPath('Start', 'End', {
      wheelchairAccessible: true,
      avoidStairs: false,
      preferElevators: true,
    });

    expect(path).toBeNull();
  });

  it('avoids pointless floor transitions when start and end are on the same floor', () => {
    const sameFloorMock: FloorData[] = [
      {
        nodes: [
          { id: 'A', label: 'A', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'H', accessible: true },
          { id: 'B', label: 'B', type: 'room', floor: 1, x: 10, y: 0, buildingId: 'H', accessible: true },
          { id: 'F2', label: 'F2', type: 'elevator_door', floor: 2, x: 5, y: 5, buildingId: 'H', accessible: true },
        ],
        edges: [
          { source: 'A', target: 'B', type: 'hallway', weight: 20, accessible: true },
          { source: 'A', target: 'F2', type: 'hallway', weight: 1, accessible: true },
          { source: 'F2', target: 'B', type: 'hallway', weight: 1, accessible: true },
        ],
      },
    ];

    const pathfinder = new IndoorPathfinder(sameFloorMock);
    const path = pathfinder.findShortestPath('A', 'B', {
      wheelchairAccessible: true,
      avoidStairs: false,
      preferElevators: false,
    });

    expect(path).not.toBeNull();
    expect(path?.map((n) => n.id)).toEqual(['A', 'B']);
  });

  it('prefers floor transitions that move toward the target floor', () => {
    const multiFloorMock: FloorData[] = [
      {
        nodes: [
          { id: 'S', label: 'Start', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'H', accessible: true },
          { id: 'D0', label: 'Down0', type: 'elevator_door', floor: 0, x: 1, y: 0, buildingId: 'H', accessible: true },
          { id: 'U2', label: 'Up2', type: 'elevator_door', floor: 2, x: 2, y: 0, buildingId: 'H', accessible: true },
          { id: 'E', label: 'End', type: 'room', floor: 3, x: 3, y: 0, buildingId: 'H', accessible: true },
        ],
        edges: [
          { source: 'S', target: 'D0', type: 'hallway', weight: 1, accessible: true },
          { source: 'D0', target: 'U2', type: 'hallway', weight: 1, accessible: true },
          { source: 'S', target: 'U2', type: 'hallway', weight: 10, accessible: true },
          { source: 'U2', target: 'E', type: 'hallway', weight: 1, accessible: true },
        ],
      },
    ];

    const pathfinder = new IndoorPathfinder(multiFloorMock);
    const path = pathfinder.findShortestPath('Start', 'End', {
      wheelchairAccessible: true,
      avoidStairs: false,
      preferElevators: false,
    });

    expect(path).not.toBeNull();
    expect(path?.[1].id).toBe('U2');
  });

  it('handles sparse floor data and dangling edges without crashing', () => {
    const sparseMock = [
      {
        nodes: [
          { id: 'S', label: 'S', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'H', accessible: true },
          { id: 'E', label: 'E', type: 'room', floor: 1, x: 1, y: 0, buildingId: 'H', accessible: true },
        ],
        edges: [
          { source: 'S', target: 'MISSING', type: 'hallway', weight: 1, accessible: true },
          { source: 'S', target: 'E', type: 'hallway', weight: 2, accessible: true },
        ],
      },
      { nodes: undefined, edges: undefined },
    ] as unknown as FloorData[];

    const pathfinder = new IndoorPathfinder(sparseMock);
    const path = pathfinder.findShortestPath('S', 'E');

    expect(path).not.toBeNull();
    expect(path?.map((n) => n.id)).toEqual(['S', 'E']);
  });

  it('returns null when no adjacency exists from the start node', () => {
    const disconnectedMock: FloorData[] = [
      {
        nodes: [
          { id: 'A', label: 'A', type: 'room', floor: 1, x: 0, y: 0, buildingId: 'H', accessible: true },
          { id: 'B', label: 'B', type: 'room', floor: 1, x: 1, y: 0, buildingId: 'H', accessible: true },
        ],
        edges: [],
      },
    ];

    const pathfinder = new IndoorPathfinder(disconnectedMock);
    const path = pathfinder.findShortestPath('A', 'B');

    expect(path).toBeNull();
  });

  it('reconstructPath skips unknown node ids safely', () => {
    const pathfinder = new IndoorPathfinder(mockData);
    const path = (pathfinder as any).reconstructPath({ MISSING: null }, 'MISSING');

    expect(path).toEqual([]);
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
