import { IndoorPathfinder, FloorData } from '../utils/indoorPathfinder';
import { AllCampusData } from '../data/buildings';

// keeping mock data even though we use AllCampusData, to make sure we have unit tests with test data incase jsons break
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

  it('successfully finds a multi-floor path using Hall building JSONs', () => {
    const pathfinder = new IndoorPathfinder(AllCampusData as any);
    
    const startId = 'H_F1_room_110';
    const endId = 'H_F2_room_171'; 

    const startNode = pathfinder['nodes'].get(startId);
    const endNode = pathfinder['nodes'].get(endId);

    if (!startNode || !endNode) {
        const allNodes = AllCampusData.flatMap(f => f.nodes);
        const fallbackStart = allNodes.find(n => n.floor === 1 && n.type === 'room');
        const fallbackEnd = allNodes.find(n => n.floor === 2 && n.type === 'room' && n.label !== fallbackStart?.label);
        
        const path = pathfinder.findShortestPath(fallbackStart?.label!, fallbackEnd?.label!);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThan(0);
    } else {
        const path = pathfinder.findShortestPath(startNode.label, endNode.label);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThan(0);
    }
  });
});
