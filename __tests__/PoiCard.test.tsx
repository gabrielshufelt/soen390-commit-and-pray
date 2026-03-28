import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PoiCard from "../components/PoiCard";

jest.mock("@expo/vector-icons", () => ({
  FontAwesome: "FontAwesome",
}));

const basePoi = {
  id: "poi-123",
  name: "POI",
  buildingCode: "H",
  floor: 1,
  distance: 100,
  coordinates: { latitude: 45.497, longitude: -73.579 }
};

describe("PoiCard Component Coverage Fix", () => {
  it("renders correctly for all POI types to ensure 100% coverage", () => {
    const types = ["washroom", "water", "elevator", "stair", "other"];
    
    types.forEach((type) => {
      const { getByText, unmount } = render(
        <PoiCard poi={{ ...basePoi, type }} onPress={() => {}} />
      );
      expect(getByText(/Building/)).toBeTruthy();
      unmount();
    });
  });

  it("triggers onPress when clicked", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <PoiCard poi={{ ...basePoi, type: "washroom", name: "Test Room" }} onPress={onPressMock} />
    );
    
    fireEvent.press(getByText("Test Room - Floor 1"));
    expect(onPressMock).toHaveBeenCalled();
  });

  it("handles distance rounding correctly", () => {
    const { getByText } = render(
      <PoiCard poi={{ ...basePoi, type: "water", distance: 160.7 }} onPress={() => {}} />
    );
    expect(getByText("161m")).toBeTruthy();
    expect(getByText("2 MIN WALK")).toBeTruthy();
  });
});
