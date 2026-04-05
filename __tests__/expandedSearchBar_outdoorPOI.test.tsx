import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ExpandedSearchBar from "../components/expandedSearchBar";
import * as locationHooks from "../hooks/useWatchLocation";

jest.mock("../hooks/useWatchLocation");
jest.mock("../hooks/useUserBuilding", () => ({
  useUserBuilding: () => ({ code: "H" }),
}));
jest.mock("../hooks/useShuttleAvailability", () => ({
  useShuttleAvailability: () => ({ available: false, nextDeparture: null }),
}));
jest.mock("../utils/poiSearch", () => ({
  searchNearbyPois: jest.fn(() => []),
  POI_TYPE_MAP: {},
}));

const mockBuildings = [
  {
    id: "1",
    name: "Hall Building (H)",
    code: "H",
    coordinate: { latitude: 45.497, longitude: -73.579 },
    campus: "SGW" as const,
    address: "1455 De Maisonneuve Blvd W",
  },
];

function makeProps(overrides: Partial<React.ComponentProps<typeof ExpandedSearchBar>> = {}) {
  return {
    buildings: mockBuildings,
    roomOptionsByBuilding: {},
    start: null,
    destination: null,
    onChangeStart: jest.fn(),
    onChangeDestination: jest.fn(),
    transportMode: "WALKING" as const,
    onChangeTransportMode: jest.fn(),
    routeActive: false,
    campus: "SGW" as const,
    onCampusSelect: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("ExpandedSearchBar outdoor POI suggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (locationHooks.useWatchLocation as jest.Mock).mockReturnValue({
      location: { coords: { latitude: 45.497, longitude: -73.579 } },
    });
  });

  it("shows outdoor POI suggestion when a coffee keyword is typed", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "coffee");

    await waitFor(() => {
      expect(getByText(/Search Coffee Shops nearby/)).toBeTruthy();
    });
  });

  it("shows outdoor POI suggestion for restaurant keyword", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "restaurant");

    await waitFor(() => {
      expect(getByText(/Search Restaurants nearby/)).toBeTruthy();
    });
  });

  it("shows outdoor POI suggestion for grocery keyword", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "grocery store");

    await waitFor(() => {
      expect(getByText(/Search Grocery Stores nearby/)).toBeTruthy();
    });
  });

  it("shows outdoor POI suggestion for study keyword", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "study space");

    await waitFor(() => {
      expect(getByText(/Search Study Spaces nearby/)).toBeTruthy();
    });
  });

  it("calls onPoiCategorySearch when the suggestion is pressed", async () => {
    const onPoiCategorySearch = jest.fn();
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps({ onPoiCategorySearch, onClose })} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "coffee");

    await waitFor(() => {
      expect(getByText(/Search Coffee Shops nearby/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Search Coffee Shops nearby/));

    expect(onPoiCategorySearch).toHaveBeenCalledWith("coffee");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not show outdoor POI suggestion for non-matching text", async () => {
    const { getByPlaceholderText, queryByTestId } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "hall building");

    await waitFor(() => {
      expect(queryByTestId("route.dest.outdoor-poi-suggestion")).toBeNull();
    });
  });

  it("does not show outdoor POI suggestion when route is active", async () => {
    const { getByPlaceholderText, queryByTestId } = render(
      <ExpandedSearchBar {...makeProps({ routeActive: true })} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent.changeText(input, "coffee");

    await waitFor(() => {
      expect(queryByTestId("route.dest.outdoor-poi-suggestion")).toBeNull();
    });
  });

  it("shows descriptive subtitle text in the suggestion", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "coffee");

    await waitFor(() => {
      expect(getByText(/Find the closest coffee shops on the map/)).toBeTruthy();
    });
  });

  it("handles case-insensitive keyword matching", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "COFFEE");

    await waitFor(() => {
      expect(getByText(/Search Coffee Shops nearby/)).toBeTruthy();
    });
  });

  it("handles keyword with leading/trailing whitespace", async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpandedSearchBar {...makeProps()} />
    );

    const input = getByPlaceholderText("Where to?");
    fireEvent(input, "focus");
    fireEvent.changeText(input, "  coffee  ");

    await waitFor(() => {
      expect(getByText(/Search Coffee Shops nearby/)).toBeTruthy();
    });
  });
});
