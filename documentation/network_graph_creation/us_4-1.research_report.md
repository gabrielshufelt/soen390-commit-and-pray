# Indoor navigation for React Native: a complete technical plan

**The optimal architecture is a PNG floor plan image with a lightweight SVG overlay for routes and markers, powered by a JSON navigation graph and Dijkstra pathfinding — all zero-cost and fully Expo-managed-workflow compatible.** This approach avoids the complexity of geographic map libraries, keeps rendering performant on mobile, and gives you full control over every component. The entire system can be built with `react-native-svg`, `react-native-gesture-handler`, `react-native-reanimated`, and the `graphology` graph library — all free, actively maintained, and Expo-compatible. Below is the full architecture, data model, library choices, conversion pipeline, and implementation roadmap.

---

## The recommended data format: SVG/PNG + JSON navigation graph

After evaluating six format options — GeoJSON, IMDF (Apple Indoor Mapping), OpenStreetMap indoor tagging, custom SVG + JSON, pure JSON graph, and GeoJSON + graph hybrid — **the clear winner for this use case is PNG floor plan images paired with a JSON navigation graph and JSON metadata files**.

IMDF is the most semantically rich indoor format (now an OGC Community Standard, not Apple-locked), but it has no free creation tools and its strict schema is overkill for 12 manually converted floor plans. GeoJSON provides excellent tooling via `geojson.io` but requires geographic coordinates and still needs a separate navigation graph for routing. OpenStreetMap indoor tagging is tied to the OSM ecosystem and awkward for private campus data. A pure JSON graph model lacks visual rendering capability.

The PNG + JSON approach wins because it **cleanly separates three concerns**: visual rendering (optimized PNG images), spatial metadata (JSON room/POI definitions), and navigation topology (JSON graph of nodes and edges). Each layer can be edited independently. The floor plan PNG handles all visual complexity — wall thickness, textures, labels, furniture — while the SVG overlay renders only the dynamic elements: route paths and POI markers. This keeps the SVG element count low (under 100 elements) and avoids the **significant performance issues** that `react-native-svg` exhibits with complex SVGs (documented rendering delays of 9–10 seconds for 500+ elements).

The recommended file structure for the entire campus:

```
/data/
  campus.json                        # Campus metadata + outdoor connections
  /buildings/
    /engineering/
      building.json                  # Building metadata, floor list, entry points
      /floors/
        floor1.png                   # Optimized floor plan image (2048px wide)
        floor1-nav.json              # Navigation graph (nodes + edges)
        floor1-meta.json             # Room and POI metadata
        floor2.png
        floor2-nav.json
        floor2-meta.json
    /library/
      building.json
      /floors/
        ...
```

Total data size for 12 buildings is estimated at **5–15 MB** (images) plus **200–400 KB** (JSON), small enough to bundle with the app.

---

## Graph modeling and pathfinding: Dijkstra on a unified campus graph

The indoor space should be modeled as a **coarse topological graph**, not a fine grid. Academic research (Yang & Worboys, 2015) confirms that for wayfinding, the graph should be "as simple as practical, with nodes representing salient points from structural and human decision-point aspects." The node taxonomy has seven types:

- **Room nodes** at each room's centroid (origin/destination points)
- **Doorway nodes** at the center of each door opening (transition between room and hallway)
- **Hallway junction nodes** at every corridor intersection
- **Hallway waypoint nodes** along long corridors every 10–20 meters or at bends
- **Stair landing nodes** at each stairwell entrance per floor
- **Elevator door nodes** at each elevator entrance per floor
- **Building entry/exit nodes** at each external door

A typical medium-complexity floor (25 rooms) requires roughly **65–75 nodes and 80–100 edges**. Across 12 buildings averaging 3 floors each, the entire campus graph totals approximately **1,500–3,000 nodes and 2,000–4,000 edges** — trivially small for any pathfinding algorithm.

The concrete JSON schema for nodes and edges:

```json
{
  "nodes": [
    {
      "id": "sciHall_F1_room101",
      "type": "room",
      "buildingId": "science-hall",
      "floor": 1,
      "x": 245,
      "y": 180,
      "label": "Chem Lab 101",
      "accessible": true,
      "metadata": { "roomType": "lab", "department": "Chemistry" }
    },
    {
      "id": "sciHall_F1_stairNorth",
      "type": "stair_landing",
      "buildingId": "science-hall",
      "floor": 1,
      "x": 50,
      "y": 20,
      "accessible": false
    }
  ],
  "edges": [
    {
      "source": "sciHall_F1_room101",
      "target": "sciHall_F1_door101",
      "type": "room_to_door",
      "weight": 5,
      "accessible": true
    },
    {
      "source": "sciHall_F1_stairNorth",
      "target": "sciHall_F2_stairNorth",
      "type": "stair",
      "weight": 30,
      "accessible": false
    }
  ]
}
```

**Dijkstra's algorithm is the recommended choice over A*** for this specific scenario. With fewer than 3,000 nodes, Dijkstra computes shortest paths in **under 5 milliseconds** on mobile JavaScript engines — fast enough to run on the main thread without blocking UI. A* would require a heuristic function, and multi-floor/multi-building routing makes Euclidean distance a poor heuristic (floor changes distort spatial relationships). Dijkstra requires zero tuning and handles cross-floor transitions transparently.

The **`graphology`** library (with `graphology-shortest-path`) is the top recommendation for the graph engine. It provides native TypeScript types, rich node/edge attribute support, Dijkstra and A* implementations, and connected-component analysis for graph validation. The alternative `ngraph.path` is also excellent and slightly more performant, but `graphology`'s ecosystem (including `graphology-components` for validation) makes it more practical.

```typescript
import Graph from 'graphology';
import { dijkstra } from 'graphology-shortest-path';

const graph = new Graph({ type: 'undirected' });
// Load all campus nodes and edges into one unified graph
campusData.nodes.forEach(n => graph.addNode(n.id, n));
campusData.edges.forEach(e => graph.addEdge(e.source, e.target, e));

// Find path — works across floors and buildings automatically
const path = dijkstra.bidirectional(graph, origin, destination, 'weight');
```

---

## Multi-floor and multi-building routing architecture

**Multi-floor connectivity** is handled by treating the entire building as a single flat graph. Stair landing nodes on adjacent floors connect via stair-type edges; elevator nodes connect across all served floors. The pathfinding algorithm does not need special multi-floor logic — it simply traverses these edges like any other, finding the globally optimal route including floor transitions.

Weight calibration for vertical transitions:

| Edge type | Normal weight | Accessible weight |
|-----------|--------------|-------------------|
| Stair (per floor) | ~30 (≈30 seconds) | `Infinity` (blocked) |
| Elevator (per floor) | ~45 (≈15s wait + 10s travel + 20s doors) | ~20 (preferred) |
| Hallway (per meter) | ~1 (≈1 second/meter) | ~1 |

**For accessibility routing**, set stair edge weights to `Infinity` and reduce elevator weights. This makes the algorithm automatically prefer elevators without any special-case code.

**Multi-building connectivity** uses the unified super-graph approach. Building entry/exit nodes connect to corresponding entry nodes of other buildings via outdoor connector edges. Since outdoor routing is already handled externally, these edges carry precomputed weights (walking time between buildings). The pathfinding algorithm then computes globally optimal routes: indoor path in Building A → best exit point → outdoor segment → best entry point in Building B → indoor path in Building B.

```json
{
  "source": "engBldg_F1_exitNorth",
  "target": "library_F1_entrySouth",
  "type": "outdoor_connector",
  "weight": 180,
  "accessible": true,
  "metadata": { "handledExternally": true }
}
```

When displaying a cross-building route, the app segments the path by floor and building, showing each segment on its respective floor plan with "Continue to Floor X" or "Exit building → Walk to Library" transition indicators.

---

## Rendering: PNG image with SVG overlay on Expo

The rendering stack uses three Expo-bundled libraries that require zero native modules:

- **`react-native-svg`** (~15.x) for route paths and POI markers
- **`react-native-gesture-handler`** (~2.x) for pinch-to-zoom and pan gestures
- **`react-native-reanimated`** (~3.x) for 60fps animated transforms

The architecture layers a lightweight SVG on top of a native `<Image>` component displaying the floor plan PNG:

```
┌──────────────────────────────────┐
│  GestureDetector (pinch + pan)   │
│  ┌────────────────────────────┐  │
│  │  Animated.View (transform) │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ <Image> floor plan   │  │  │
│  │  │ <Svg> overlay:       │  │  │
│  │  │   • Route <Path>     │  │  │
│  │  │   • POI <Circle>     │  │  │
│  │  │   • Labels <Text>    │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
│  Floor selector buttons (abs.)   │
└──────────────────────────────────┘
```

This approach was chosen over five alternatives. **react-native-maps** requires geographic coordinates and hacky Mercator projection workarounds for pixel-based floor plans. **Mapbox** requires a dev client (breaking Expo managed workflow), an API key, and account setup. **Leaflet via WebView** adds 100–200ms bridge latency and loses native gesture performance. **react-native-skia** requires a dev client and has no built-in marker/popup system. **Full SVG floor plans** via react-native-svg hit documented performance walls at 500+ elements.

The PNG + SVG overlay sidesteps all these issues. Native image rendering is fast. The SVG layer contains only **one `<Path>` element for the route** plus **20–50 `<Circle>`/`<Text>` elements for POI markers** — well within react-native-svg's performance comfort zone. Route paths convert directly from the pathfinding result: the array of node coordinates becomes an SVG path string `M x0 y0 L x1 y1 L x2 y2...` rendered as a colored polyline.

For zoom and pan, the `react-native-zoom-reanimated` package provides a ready-made container with pinch, pan, double-tap zoom, and rubber-band boundary effects. Alternatively, build a custom implementation with simultaneous `Gesture.Pinch` and `Gesture.Pan` driving reanimated shared values on an `Animated.View` transform — a well-documented pattern that gives full control.

Floor switching is simple React state: tapping a floor button updates `selectedFloor`, which swaps the PNG source, filters the navigation graph for that floor's route segment, and updates POI marker positions. A vertical pill-button UI (similar to Google Maps indoor floor selector) works well, positioned in the top-right corner of the map.

---

## The floor plan conversion pipeline

Converting 12 floor plans from mixed PDF/PNG/SVG to the final navigable format involves four phases. **Estimated total effort: 4–6 weeks for one developer.**

**Phase 1: Standardize to PNG (Days 1–3).** Convert all source files to optimized PNG images at **2048px width** (or native aspect ratio at 2x resolution for retina displays). For vector PDFs, use `pdf2svg` or Inkscape's CLI (`inkscape input.pdf --export-type=png --export-width=2048`). For scanned/raster PDFs, export the embedded image at maximum resolution. For existing PNGs, resize if needed. For SVGs, export to PNG via Inkscape. Compress all outputs with TinyPNG or similar to keep each file under **1–2 MB**. This phase also produces SVG versions from vector PDFs for reference during graph creation.

**Phase 2: Build the navigation graph editor (Days 4–7).** Create a simple web-based tool — an HTML page with a canvas showing the floor plan PNG as background. Click to place nodes (auto-captures x,y pixel coordinates), shift-click two nodes to connect them with an edge, right-click to set node properties (type, room name, accessibility). Auto-calculate edge weights from Euclidean pixel distance. Add an export-to-JSON button. Multiple developers building indoor navigation systems have converged on exactly this approach — the WayFrame tool, Stanford's Graph Localization Networks team, and the Pathpal/Indoor Wayfinder project all built custom click-on-image editors. **This tool is a one-time investment of 2–3 days that pays for itself across all 12 floor plans.**

**Phase 3: Create navigation data (Days 8–18).** For each floor plan, load it in the graph editor and systematically place nodes: start at building entrances, walk the hallways placing junction nodes at every intersection, add doorway nodes at each room entrance, place room centroid nodes inside each room, mark stair landings and elevator doors. Then connect adjacent nodes with edges. Finally, add POI metadata (room names, types, categories). Estimated **1–3 hours per floor** depending on complexity, totaling 12–36 hours.

**Phase 4: Wire cross-floor and cross-building connections (Days 19–21).** Add stair and elevator edges connecting corresponding nodes across floors. Add outdoor connector edges between building entry/exit nodes. Validate the complete campus graph for connectivity using `graphology-components` — verify it's a single connected component, check for orphan nodes with zero edges, test sample paths between distant rooms across buildings.

Key tools for the pipeline, all free:

- **Inkscape** for SVG editing, cleanup, and PDF-to-SVG conversion
- **SVGO** for SVG optimization (if SVG rendering is used)
- **TinyPNG/pngquant** for PNG compression
- **Custom HTML/JS graph editor** (build once, use for all 12 plans)
- **Any text editor** for JSON metadata

**Skip QGIS and georeferencing.** These are overkill unless you need real-world geographic coordinates for outdoor map integration. Pixel coordinates matching the floor plan image dimensions are sufficient and dramatically simpler.

---

## Open-source reference implementations worth studying

Three open-source projects align closely with this architecture and serve as practical references:

**Indoor Wayfinder (Pathpal)** at `github.com/KnotzerIO/indoor-wayfinder` (~89 stars, MIT license, updated February 2025) is the closest match. It implements interactive SVG floor plans with Dijkstra pathfinding in React + TypeScript, storing all data in JSON. The demo at `indoor.knotzer.io` shows the exact UX pattern needed: click origin, click destination, see route drawn on the floor plan. It lacks multi-floor support but provides the core rendering and pathfinding patterns to port to React Native.

**indrz** at `github.com/indrz` (~109 stars, GPL-3.0) is the most complete open-source indoor wayfinding system, deployed at the Vienna University of Economics campus. It uses PostGIS, Django, and Vue.js — a heavier stack than needed — but its data model for multi-building university navigation and its routing logic are excellent architectural references. The project's creator acknowledges that "data preparation is the hardest part," validating the emphasis on the conversion pipeline.

**leaflet-indoor** at `github.com/cbaines/leaflet-indoor` (~361 stars, BSD-2-Clause) provides a proven indoor map layer for Leaflet with GeoJSON data and floor-switching controls. If you ever pivot to the Leaflet-via-WebView rendering approach, this is the starting point. Leaflet's `CRS.Simple` mode with `imageOverlay` is a well-documented pattern for non-geographic floor plan display, proven in production at LINE Corporation's office management system.

---

## Implementation roadmap and key decisions summarized

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Floor plan format | PNG images + JSON metadata + JSON nav graph | Cleanest separation of concerns; best mobile performance |
| Rendering library | `react-native-svg` overlay on `<Image>` | Expo-managed compatible; minimal SVG elements = fast |
| Zoom/pan | `react-native-gesture-handler` + `react-native-reanimated` | 60fps, native thread, Expo-compatible |
| Graph library | `graphology` + `graphology-shortest-path` | TypeScript-native, rich API, validation tools |
| Pathfinding algorithm | Dijkstra (not A*) | Simpler, no heuristic tuning, <5ms on 3K nodes |
| Multi-floor model | Unified flat graph with stair/elevator edges | Algorithm handles transitions transparently |
| Multi-building model | Super-graph with outdoor connector edges | Global route optimization across campus |
| Coordinate system | Pixel coordinates matching PNG dimensions | No georeferencing needed; dramatically simpler |
| Graph creation | Custom web-based click-on-image editor | 2–3 day build; reused for all 12 floor plans |
| Source conversion | Inkscape CLI for PDF→PNG; TinyPNG for compression | Free tools, batch-processable |
| Accessibility | Edge weight modifiers (stairs→∞, elevators→preferred) | Zero special-case code in algorithm |

The total implementation breaks into five phases: (1) floor plan conversion and optimization, 1 week; (2) graph editor tool and navigation data creation, 2 weeks; (3) core rendering and pathfinding engine in React Native, 1–2 weeks; (4) UI for origin/destination selection, floor switching, POI browsing, 1 week; (5) multi-building integration with existing outdoor routing, 1 week. **A single developer can ship an MVP in 6–8 weeks.**

## Conclusion

The key architectural insight is that indoor navigation does not require a mapping platform. Geographic map libraries (Mapbox, Google Maps, Leaflet) solve problems this app doesn't have — tile servers, projections, base maps, geocoding. A campus indoor navigator is fundamentally a **graph problem with a visual overlay**, and the simplest correct architecture treats it that way: static images for visuals, a lightweight JSON graph for routing, and a thin SVG layer to draw the path. Every added abstraction (GeoJSON polygons, IMDF schemas, geographic coordinates) adds complexity without adding value for this use case. The entire system — from floor plan images to pathfinding to route rendering — runs locally with zero network dependencies, zero API keys, and zero recurring costs.