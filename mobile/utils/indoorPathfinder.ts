import { PriorityQueue } from './priorityQueue';

export interface IndoorNode {
  id: string;
  type: string;
  floor: number;
  x: number;
  y: number;
  label: string;
  accessible: boolean;
}

export interface IndoorEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  accessible: boolean;
}

export interface FloorData {
  nodes: IndoorNode[];
  edges: IndoorEdge[];
}

export class IndoorPathfinder {
  private nodes: Map<string, IndoorNode> = new Map();
  private adjacencyList: Map<string, IndoorEdge[]> = new Map();

  // this constructor should accept array of floors from index.ts in the data/buildings/ folder 
  constructor(allFloorData: FloorData[]) {
    allFloorData.forEach(floor => {
      if (!floor || !floor.nodes) return; 
      
      floor.nodes.forEach(node => this.nodes.set(node.id, node));
      floor.edges.forEach(edge => {
        if (!this.adjacencyList.has(edge.source)) {
          this.adjacencyList.set(edge.source, []);
        }
        this.adjacencyList.get(edge.source)?.push(edge);
      });
    });
  }

  /**
   * lil legend:
   * Stairs = Infinite (Blocks them for now)
   * Elevators = 0 (Encourages floor jumping)
   * Hallways = edge.weight (Actual distance)
   */
  private getEdgeWeight(edge: IndoorEdge): number {
    if (edge.type === 'stair' || !edge.accessible) {
      return Infinity;
    }
    if (edge.type === 'elevator') {
      return 0;
    }
    return edge.weight;
  }

  public findShortestPath(startRoomLabel: string, endRoomLabel: string): IndoorNode[] | null {
    const startNode = Array.from(this.nodes.values()).find(n => n.label === startRoomLabel && n.type === 'room');
    const endNode = Array.from(this.nodes.values()).find(n => n.label === endRoomLabel && n.type === 'room');

    if (!startNode || !endNode) return null;

    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const pq = new PriorityQueue<string>();

    this.nodes.forEach((_, id) => {
      distances[id] = Infinity;
      previous[id] = null;
    });

    distances[startNode.id] = 0;
    pq.enqueue(startNode.id, 0);

    while (!pq.isEmpty()) {
      const currentId = pq.dequeue()!;
      if (currentId === endNode.id) break;

      const neighbors = this.adjacencyList.get(currentId) || [];
      for (const edge of neighbors) {
        const weight = this.getEdgeWeight(edge);
        const alt = distances[currentId] + weight;

        if (alt < distances[edge.target]) {
          distances[edge.target] = alt;
          previous[edge.target] = currentId;
          pq.enqueue(edge.target, alt);
        }
      }
    }

    return this.reconstructPath(previous, endNode.id);
  }

  private reconstructPath(previous: Record<string, string | null>, endId: string): IndoorNode[] {
    const path: IndoorNode[] = [];
    let curr: string | null = endId;
    while (curr !== null) {
      const node = this.nodes.get(curr);
      if (node) path.unshift(node);
      curr = previous[curr];
    }
    return path.length > 1 ? path : [];
  }
}
