import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import type { MapViewDirectionsMode } from 'react-native-maps-directions';
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
    name: "Administration Building (AD) (AD)",
    code: "AD",
    address: "7141 Sherbrooke St. W.",
    coordinate: { latitude: 45.458, longitude: -73.639 },
    campus: "Loyola",
  },
];

const defaultProps = {
    buildings: mockBuildings,
    start: null,
    destination: null,
    onChangeStart: jest.fn(),
    onChangeDestination: jest.fn(),
    routeActive: false,
    onStartRoute: jest.fn(),
    onEndRoute: jest.fn(),
    onChangeTransportMode: jest.fn(),
    transportMode: 'WALKING' as MapViewDirectionsMode,
    previewActive: false,
};

describe("<SearchBar />", () => {
    beforeEach(() => {
    jest.clearAllMocks();
    });

    describe("Collapsed/Expanded State", () => {
        it("renders in collapsed state by default", () => {
        const { getByText, queryByText } = render(<SearchBar {...defaultProps} />);
      
        expect(getByText("Search buildings, rooms...")).toBeTruthy();
        expect(queryByText("Route")).toBeNull();
    });

        it("expands when collapsed bar is pressed", () => {
            const { getByText } = render(<SearchBar {...defaultProps} />);
        
            fireEvent.press(getByText("Search buildings, rooms..."));
        
            expect(getByText("Route")).toBeTruthy();
            expect(getByText("SGW Campus")).toBeTruthy();
        });

        it("collapses when back button is pressed", () => {
            const { getByText, queryByText } = render(
            <SearchBar {...defaultProps} defaultExpanded={true} />
            );
        
            expect(getByText("Route")).toBeTruthy();
        
            fireEvent.press(getByText("‹"));
        
            waitFor(() => {
            expect(queryByText("Route")).toBeNull();
            expect(getByText("Search buildings, rooms...")).toBeTruthy();
            });
        });
    });

    describe("Campus Toggle", () => {
        it("shows SGW campus by default", () => {
            const { getByText } = render(
            <SearchBar {...defaultProps} defaultExpanded={true} />
            );
      
        const sgwButton = getByText("SGW Campus");
        expect(sgwButton).toBeTruthy();
        });

        it("switches to Loyola campus when toggled", () => {
            const { getByText } = render(
            <SearchBar {...defaultProps} defaultExpanded={true} />
            );
      
            fireEvent.press(getByText("Loyola Campus"));
      
            expect(getByText("Loyola Campus")).toBeTruthy();
        });
    });

    describe("Input Fields", () => {
        it("Shows placeholder text for start point input", () => {
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
            expect(getByPlaceholderText("Current Location")).toBeTruthy();
        });

        it("Shows placeholder text for destination input", () => {
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
            expect(getByPlaceholderText("Where to?")).toBeTruthy();
        });

        it("Verifies typing works in Start Point", () => {
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
      
            const startInput = getByPlaceholderText("Current Location");
            fireEvent.changeText(startInput, "Hall");
      
            expect(startInput.props.value).toBe("Hall");
        });

        it("Verifies typing works in Destination", () => {
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
      
            const destInput = getByPlaceholderText("Where to?");
            fireEvent.changeText(destInput, "Hall");
      
            expect(destInput.props.value).toBe("Hall");
        });
    })
    


    describe("Suggestions", () => {
        it("Shows destination suggestions when typing", async () => {
            const { getByPlaceholderText, getByText } = render(
            <SearchBar {...defaultProps} defaultExpanded={true} />
        );
        
            const destInput = getByPlaceholderText("Where to?");
            fireEvent(destInput, "focus");
            fireEvent.changeText(destInput, "Hall");
        
            await waitFor(() => {
                expect(getByText(/Henry F. Hall Building \(H\)/)).toBeTruthy();
            });
        });

        it("Shows start suggestions when typing in start field", async () => {
            const { getByPlaceholderText, getByText } = render(
            <SearchBar {...defaultProps} defaultExpanded={true} />
            );
        
            const startInput = getByPlaceholderText("Current Location");
            fireEvent(startInput, "focus");
            fireEvent.changeText(startInput, "Molson");
        
            await waitFor(() => {
                expect(getByText(/John Molson School of Business \(MB\)/)).toBeTruthy();
            });
        });
        
        it("Calls onChangeDestination when suggestion is selected", async () => {
            const onChangeDestination = jest.fn();
            const { getByPlaceholderText, getByText } = render(
                <SearchBar {...defaultProps} onChangeDestination={onChangeDestination} defaultExpanded={true} />
            );
      
            const destInput = getByPlaceholderText("Where to?");
            fireEvent(destInput, "focus");
            fireEvent.changeText(destInput, "Hall");
      
            await waitFor(() => {
                expect(getByText(/Henry F. Hall Building \(H\)/)).toBeTruthy();
            });
      
            fireEvent.press(getByText(/Henry F. Hall Building \(H\)/));
      
            expect(onChangeDestination).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "1",
                    name: "Henry F. Hall Building (H)",
                    code: "H",
                })
            );
    });





    });

    describe("Buttons", () => {
        it("Shows Start Directions button when destination is set and route not active", () => {
            const destination: BuildingChoice = mockBuildings[0];
            const { getByText } = render(
            <SearchBar {...defaultProps} destination={destination} defaultExpanded={true} />
            );
        
            expect(getByText("Start Directions")).toBeTruthy();
        });

        it("Does not show Start Directions button when destination is null", () => {
            const { queryByText } = render(
            <SearchBar {...defaultProps} destination={null} defaultExpanded={true} />
            );
        
            expect(queryByText("Start Directions")).toBeNull();
        });

        it("Shows End Directions button when route is active", () => {
            const { getByText } = render(
            <SearchBar {...defaultProps} routeActive={true} defaultExpanded={true} />
            );
        
            expect(getByText("End Directions")).toBeTruthy();
        });

        it("Calls onStartRoute when Start Directions is pressed", () => {
            const onStartRoute = jest.fn();
            const destination: BuildingChoice = mockBuildings[0];
            const { getByText } = render(
                <SearchBar 
                {...defaultProps} 
                destination={destination} 
                onStartRoute={onStartRoute}
                defaultExpanded={true}
                />
            );
        
            fireEvent.press(getByText("Start Directions"));
        
            expect(onStartRoute).toHaveBeenCalled();
        });

        it("Calls onEndRoute when End Directions is pressed", () => {
            const onEndRoute = jest.fn();
            const { getByText } = render(
                <SearchBar 
                {...defaultProps} 
                routeActive={true}
                onEndRoute={onEndRoute}
                defaultExpanded={true}
                />
            );
        
            fireEvent.press(getByText("End Directions"));
        
            expect(onEndRoute).toHaveBeenCalled();
        });
    });

    describe("Quick Filters", () => {
        it("Shows Home, Library, and Favorites filters", () => {
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
        
            expect(getByText("Home")).toBeTruthy();
            expect(getByText("Library")).toBeTruthy();
            expect(getByText("Favorites")).toBeTruthy();
        });

        it("Switches active filter when clicked", () => {
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
        
            fireEvent.press(getByText("Library"));
        
            expect(getByText("Library")).toBeTruthy();
        });
    });



});