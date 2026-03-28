import { searchNearbyPois } from "../utils/poiSearch";
import { AllCampusData } from "../data/buildings";

jest.mock("../data/buildings", () => ({
  AllCampusData: [
    {
      meta: { buildingId: "H", floor: 1 },
      nodes: [
        { id: "H1", type: "elevator_door", latitude: 45.4971, longitude: -73.5791, label: "Elevator 1" },
        { id: "H2", type: "stair_landing", latitude: 45.4972, longitude: -73.5792, label: "Stairs A" }
      ]
    },
    {
      meta: { buildingId: "MB", floor: 1 },
      nodes: [
        { id: "MB1", type: "elevator_door", latitude: 45.4951, longitude: -73.5781, label: "MB Elevator" }
      ]
    }
  ]
}));

describe("poiSearch Utility", () => {
  const userLat = 45.4970;
  const userLng = -73.5790;

  it("returns empty array for invalid keywords", () => {
    const results = searchNearbyPois("gym", userLat, userLng, "H");
    expect(results).toEqual([]);
  });

  it("filters by elevator keyword", () => {
    const results = searchNearbyPois("elevator", userLat, userLng, "H");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("elevator_door");
  });

  it("prioritizes current building nodes", () => {
    const results = searchNearbyPois("elevator", userLat, userLng, "H");
    expect(results.every(r => r.buildingCode === "H")).toBe(true);
  });

  it("finds nearest nodes regardless of building if currentBuilding is null", () => {
    const results = searchNearbyPois("elevator", userLat, userLng, null);
    expect(results.length).toBeGreaterThan(1);
    const buildingCodes = results.map(r => r.buildingCode);
    expect(buildingCodes).toContain("H");
    expect(buildingCodes).toContain("MB");
  });

  it("limits results to 5", () => {
    const results = searchNearbyPois("elevator", userLat, userLng, "H");
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
