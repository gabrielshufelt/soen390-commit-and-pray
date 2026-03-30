import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ExpandedSearchBar from "../components/expandedSearchBar";
import * as poiUtils from "../utils/poiSearch";
import * as locationHooks from "../hooks/useWatchLocation";

jest.mock("../hooks/useWatchLocation");
jest.mock("../hooks/useUserBuilding", () => ({
  useUserBuilding: () => ({ code: "H" })
}));
jest.mock("../hooks/useShuttleAvailability", () => ({
  useShuttleAvailability: () => ({ available: false, nextDeparture: null })
}));
jest.mock("../utils/poiSearch");

const mockBuildings = [
  { id: "1", name: "Hall", code: "H", coordinate: { latitude: 0, longitude: 0 } }
];

const mockPoiResult = {
  id: "poi-1",
  name: "Elevator 1",
  type: "elevator_door",
  buildingCode: "H",
  floor: 1,
  distance: 10,
  coordinates: { latitude: 1, longitude: 1 }
};

describe("ExpandedSearchBar POI Integration", () => {
  it("shows POI results when a keyword is typed and handles selection", async () => {
    (locationHooks.useWatchLocation as jest.Mock).mockReturnValue({
      location: { coords: { latitude: 0, longitude: 0 } }
    });
    (poiUtils.searchNearbyPois as jest.Mock).mockReturnValue([mockPoiResult]);

    const mockOnChangeDest = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar
        buildings={mockBuildings}
        roomOptionsByBuilding={{}}
        start={null}
        destination={null}
        onChangeStart={() => {}}
        onChangeDestination={mockOnChangeDest}
        transportMode="WALKING"
        onChangeTransportMode={() => {}}
        routeActive={false}
        campus="SGW"
        onCampusSelect={() => {}}
        onClose={() => {}}
      />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "elevator");

    await waitFor(() => {
      expect(getByText("Elevator 1 — Floor 1")).toBeTruthy();
    });

    fireEvent.press(getByText("Elevator 1 — Floor 1"));

    expect(mockOnChangeDest).toHaveBeenCalledWith(expect.objectContaining({
      id: "poi-1",
      code: "H"
    }));
  });
});
