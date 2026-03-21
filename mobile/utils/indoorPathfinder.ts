import { PriorityQueue } from './priorityQueue';

export interface IndoorNode {
  id: string;
  type: string;
  floor: number;
  x: number;
  y: number;
  label: string;
  buildingId: string;
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
  private readonly nodes: Map<string, IndoorNode> = new Map();
  private readonly adjacencyList: Map<string, IndoorEdge[]> = new Map();

  constructor(allFloorData: FloorData[]) {
    // 1. Load all nodes
    allFloorData.forEach((floor) => {
      if (!floor?.nodes) return;
      floor.nodes.forEach((node) => this.nodes.set(node.id, node));
    });

    // 2. Load all JSON edges (Ensure bi-directionality)
    allFloorData.forEach((floor) => {
      if (!floor?.edges) return;
      floor.edges.forEach((edge) => {
        this.addEdge(edge);
        this.addEdge({
          source: edge.target,
          target: edge.source,
          weight: edge.weight,
          type: edge.type,
          accessible: edge.accessible,
        });
      });
    });

    // 3. System-wide bridges and data healing
    this.bridgeFloorsByCoordinates();
    this.healBrokenData();
  }

  private bridgeFloorsByCoordinates() {
    const nodesArray = Array.from(this.nodes.values());
    const connectors = nodesArray.filter(
      (n) => n.type.includes('elevator') || n.type.includes('stair')
    );

    connectors.forEach((nodeA) => {
      connectors.forEach((nodeB) => {
        if (nodeA.buildingId === nodeB.buildingId && nodeA.floor !== nodeB.floor) {
          const dist = Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
          if (dist < 50) {
            this.addEdge({
              source: nodeA.id,
              target: nodeB.id,
              type: nodeA.type.includes('elevator') ? 'elevator' : 'stair',
              weight: 0,
              accessible: true,
            });
          }
        }
      });
    });
  }

  private healBrokenData() {
    const allNodes = Array.from(this.nodes.values());
    const rooms = allNodes.filter(n => n.type === 'room');
    const waypoints = allNodes.filter(n => 
      n.type.includes('waypoint') || 
      n.type.includes('doorway') || 
      n.type === 'building_entry' || 
      n.type === 'building_exit'
    );

    rooms.forEach(room => {
      let closest = null;
      let minEntryDist = 200;

      waypoints.forEach(wp => {
        if (room.buildingId === wp.buildingId && room.floor === wp.floor) {
          const d = Math.sqrt(Math.pow(room.x - wp.x, 2) + Math.pow(room.y - wp.y, 2));
          if (d < minEntryDist) {
            minEntryDist = d;
            closest = wp;
          }
        }
      });

      if (closest) {
        const edge = {
          source: room.id,
          target: (closest as any).id,
          type: 'auto_connect',
          weight: minEntryDist,
          accessible: true
        };
        this.addEdge(edge);
        this.addEdge({ ...edge, source: edge.target, target: edge.source });
      }
    });
  }

  private addEdge(edge: IndoorEdge) {
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, []);
    }
    this.adjacencyList.get(edge.source)?.push(edge);
  }

  private getEdgeWeight(edge: IndoorEdge): number {
    if (edge.type === 'stair' || !edge.accessible) return Infinity;
    return edge.type === 'elevator' ? 0 : edge.weight;
  }

  public findShortestPath(startLabel: string, endLabel: string): IndoorNode[] | null {
    const nodes = Array.from(this.nodes.values());

    const startNode = nodes.find(n => n.label.trim() === startLabel.trim() && n.type === 'room');
    if (!startNode) return null;

    const endNode = nodes.find(n => 
      n.label.trim() === endLabel.trim() && 
      n.type === 'room' && 
      n.buildingId === startNode.buildingId
    );
    if (!endNode) return null;

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
        if (weight === Infinity) continue;

        const alt = distances[currentId] + weight;
        if (alt < distances[edge.target]) {
          distances[edge.target] = alt;
          previous[edge.target] = currentId;
          pq.enqueue(edge.target, alt);
        }
      }
    }

    const path = this.reconstructPath(previous, endNode.id);
    return path.length > 1 ? path : null;
  }

  private reconstructPath(previous: Record<string, string | null>, endId: string): IndoorNode[] {
    const path: IndoorNode[] = [];
    let curr: string | null = endId;
    while (curr !== null) {
      const node = this.nodes.get(curr);
      if (node) path.unshift(node);
      curr = previous[curr];
    }
    return path;
  }
}
