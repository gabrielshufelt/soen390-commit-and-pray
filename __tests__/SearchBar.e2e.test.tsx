import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import SearchBar, { BuildingChoice } from "../components/searchBar";

const mockBuildings: BuildingChoice[] = [
  {
    id: "1",
    name: "Henry F. Hall Building (H)",
    code: "H",
    address: "1455 De Maisonneuve Blvd. W.",
    coordinate: { latitude: 45.497, longitude: -73.579 },
    campus: "SGW",
  },
  {
    id: "2",
    name: "John Molson School of Business (MB)",
    code: "MB",
    address: "1600 De Maisonneuve Blvd. W.",
    coordinate: { latitude: 45.495, longitude: -73.578 },
    campus: "SGW",
  },
  {
    id: "3",
    name: "Administration Building (AD)",
    code: "AD",
    address: "7141 Sherbrooke St. W.",
    coordinate: { latitude: 45.458, longitude: -73.639 },
    campus: "Loyola",
  },
];

describe("SearchBar end-to-end flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("user selects start + destination then starts directions", async () => {
    const onChangeStart = jest.fn();
    const onChangeDestination = jest.fn();
    const onStartRoute = jest.fn();
    const onPreviewRoute = jest.fn();

    // 1) render collapsed first (like real app)
    const screen = render(
      <SearchBar
        buildings={mockBuildings}
        start={null}
        destination={null}
        onChangeStart={onChangeStart}
        onChangeDestination={onChangeDestination}
        routeActive={false}
        onStartRoute={onStartRoute}
        onEndRoute={jest.fn()}
      />
    );

    // 2) open search UI (collapsed -> expanded)
    // Your current tests press the text; this also works.
    fireEvent.press(screen.getByText("Search buildings, rooms..."));
    expect(screen.getByText("Route")).toBeTruthy();

    // 3) start: focus and type, then choose suggestion
    const startInput = screen.getByPlaceholderText("Current Location");
    fireEvent(startInput, "focus");
    fireEvent.changeText(startInput, "Molson");

    await waitFor(() => {
      expect(screen.getByText(/John Molson School of Business \(MB\)/)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/John Molson School of Business \(MB\)/));

    expect(onChangeStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2", code: "MB" })
    );

    // 4) destination: focus and type, then choose suggestion
    const destInput = screen.getByPlaceholderText("Where to?");
    fireEvent(destInput, "focus");
    fireEvent.changeText(destInput, "Hall");

    await waitFor(() => {
      expect(screen.getByText(/Henry F. Hall Building \(H\)/)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/Henry F. Hall Building \(H\)/));

    expect(onChangeDestination).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", code: "H" })
    );

    // 5) IMPORTANT: in your component, Start Directions button appears only if
    // the *destination prop* is not null (parent state).
    // So we simulate the parent updating props after selection using rerender.
    screen.rerender(
      <SearchBar
        buildings={mockBuildings}
        start={mockBuildings[1]}        // Molson
        destination={mockBuildings[0]}  // Hall
        onChangeStart={onChangeStart}
        onChangeDestination={onChangeDestination}
        routeActive={false}
        onStartRoute={onStartRoute}
        onPreviewRoute={onPreviewRoute}
        onEndRoute={jest.fn()}
        defaultExpanded={true}
      />
    );

    // 6) start has a specific building selected, so "Preview Route" is shown instead of "Start Directions"
    fireEvent.press(screen.getByText("Preview Route"));
    expect(onPreviewRoute).toHaveBeenCalledTimes(1);
  });
});
