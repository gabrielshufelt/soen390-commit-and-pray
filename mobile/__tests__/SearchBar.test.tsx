import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";

import type { MapViewDirectionsMode } from 'react-native-maps-directions';
import SearchBar, { BuildingChoice } from "../components/searchBar";

const mockShuttleAvailability = jest.fn();
jest.mock('../hooks/useShuttleAvailability', () => ({
  useShuttleAvailability: () => mockShuttleAvailability(),
}));

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

const shuttleAvailableResult = { available: true, nextDeparture: '10:00' };
const shuttleUnavailableResult = { available: false, nextDeparture: null };

describe("<SearchBar />", () => {
    beforeEach(() => {
    jest.clearAllMocks();
    mockShuttleAvailability.mockReturnValue(shuttleUnavailableResult);
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

    describe("Campus change", () => {
        it("calls onCampusChange when switching to Loyola", () => {
            const onCampusChange = jest.fn();
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} onCampusChange={onCampusChange} />
            );
            fireEvent.press(getByText("Loyola Campus"));
            expect(onCampusChange).toHaveBeenCalledWith("Loyola");
        });

        it("calls onCampusChange when switching back to SGW", () => {
            const onCampusChange = jest.fn();
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} onCampusChange={onCampusChange} />
            );
            fireEvent.press(getByText("Loyola Campus"));
            fireEvent.press(getByText("SGW Campus"));
            expect(onCampusChange).toHaveBeenLastCalledWith("SGW");
        });

        it("resets shuttle when campus changes while shuttle is active", () => {
            const onUseShuttleChange = jest.fn();
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    defaultExpanded={true}
                    useShuttle={true}
                    onUseShuttleChange={onUseShuttleChange}
                />
            );
            fireEvent.press(getByText("Loyola Campus"));
            expect(onUseShuttleChange).toHaveBeenCalledWith(false);
        });
    });

    describe("Start suggestion selection", () => {
        it("calls onChangeStart when a start suggestion is selected", async () => {
            const onChangeStart = jest.fn();
            const { getByPlaceholderText, getByText } = render(
                <SearchBar {...defaultProps} onChangeStart={onChangeStart} defaultExpanded={true} />
            );
            const startInput = getByPlaceholderText("Current Location");
            fireEvent(startInput, "focus");
            fireEvent.changeText(startInput, "Administration");
            await waitFor(() => {
                expect(getByText(/Administration Building \(AD\)/)).toBeTruthy();
            });
            fireEvent.press(getByText(/Administration Building \(AD\)/));
            expect(onChangeStart).toHaveBeenCalledWith(
                expect.objectContaining({ id: "3", code: "AD" })
            );
        });

        it("clears start choice (calls onChangeStart(null)) when start text is manually edited", () => {
            const onChangeStart = jest.fn();
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} onChangeStart={onChangeStart} defaultExpanded={true} />
            );
            const startInput = getByPlaceholderText("Current Location");
            fireEvent.changeText(startInput, "some text");
            expect(onChangeStart).toHaveBeenCalledWith(null);
        });

        it("clears destination choice (calls onChangeDestination(null)) when dest text is manually edited", () => {
            const onChangeDestination = jest.fn();
            const { getByPlaceholderText } = render(
                <SearchBar {...defaultProps} onChangeDestination={onChangeDestination} defaultExpanded={true} />
            );
            const destInput = getByPlaceholderText("Where to?");
            fireEvent.changeText(destInput, "some text");
            expect(onChangeDestination).toHaveBeenCalledWith(null);
        });
    });

    describe("Preview Route button", () => {
        it("shows Preview Route button when both start and destination are set", () => {
            const start: BuildingChoice = mockBuildings[0];
            const destination: BuildingChoice = mockBuildings[1];
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    start={start}
                    destination={destination}
                    onPreviewRoute={jest.fn()}
                    defaultExpanded={true}
                />
            );
            expect(getByText("Preview Route")).toBeTruthy();
        });

        it("does NOT show Preview Route button when only destination is set (no start)", () => {
            const destination: BuildingChoice = mockBuildings[0];
            const { queryByText } = render(
                <SearchBar
                    {...defaultProps}
                    destination={destination}
                    onPreviewRoute={jest.fn()}
                    defaultExpanded={true}
                />
            );
            expect(queryByText("Preview Route")).toBeNull();
        });

        it("calls onPreviewRoute when Preview Route button is pressed", () => {
            const onPreviewRoute = jest.fn();
            const start: BuildingChoice = mockBuildings[0];
            const destination: BuildingChoice = mockBuildings[1];
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    start={start}
                    destination={destination}
                    onPreviewRoute={onPreviewRoute}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByText("Preview Route"));
            expect(onPreviewRoute).toHaveBeenCalledTimes(1);
        });
    });

    describe("Exit Preview button", () => {
        it("shows Exit Preview button when previewActive is true and both points are set", () => {
            const start: BuildingChoice = mockBuildings[0];
            const destination: BuildingChoice = mockBuildings[1];
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    start={start}
                    destination={destination}
                    previewActive={true}
                    onExitPreview={jest.fn()}
                    defaultExpanded={true}
                />
            );
            expect(getByText("Exit Preview")).toBeTruthy();
        });

        it("calls onExitPreview when Exit Preview button is pressed", () => {
            const onExitPreview = jest.fn();
            const start: BuildingChoice = mockBuildings[0];
            const destination: BuildingChoice = mockBuildings[1];
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    start={start}
                    destination={destination}
                    previewActive={true}
                    onExitPreview={onExitPreview}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByText("Exit Preview"));
            expect(onExitPreview).toHaveBeenCalledTimes(1);
        });
    });

    describe("Time estimate card", () => {
        it("shows estimated time when previewRouteInfo has durationText and a destination is set", () => {
            const destination: BuildingChoice = mockBuildings[0];
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    destination={destination}
                    previewRouteInfo={{ durationText: "12 min", distanceText: "1.2 km" }}
                    defaultExpanded={true}
                />
            );
            expect(getByText(/12 min/)).toBeTruthy();
            expect(getByText(/1.2 km/)).toBeTruthy();
        });

        it("does NOT show time estimate without a destination", () => {
            const { queryByText } = render(
                <SearchBar
                    {...defaultProps}
                    destination={null}
                    previewRouteInfo={{ durationText: "12 min", distanceText: "1.2 km" }}
                    defaultExpanded={true}
                />
            );
            expect(queryByText(/12 min/)).toBeNull();
        });
    });

    describe("Shuttle checkbox", () => {
        it("shows shuttle checkbox when transport mode is TRANSIT and shuttle is available", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    defaultExpanded={true}
                />
            );
            expect(getByText("Use Concordia Shuttle")).toBeTruthy();
        });

        it("does NOT show shuttle checkbox when transport mode is WALKING", () => {
            const { queryByText } = render(
                <SearchBar {...defaultProps} transportMode="WALKING" defaultExpanded={true} />
            );
            expect(queryByText("Use Concordia Shuttle")).toBeNull();
        });

        it("does NOT show shuttle checkbox when transport mode is DRIVING", () => {
            const { queryByText } = render(
                <SearchBar {...defaultProps} transportMode="DRIVING" defaultExpanded={true} />
            );
            expect(queryByText("Use Concordia Shuttle")).toBeNull();
        });

        it("shows 'No service' when shuttle is not available", () => {
            mockShuttleAvailability.mockReturnValue(shuttleUnavailableResult);
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    defaultExpanded={true}
                />
            );
            expect(getByText("Use Concordia Shuttle")).toBeTruthy();
            expect(getByText("No service")).toBeTruthy();
        });

        it("shows next departure time when shuttle is available", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    defaultExpanded={true}
                />
            );
            expect(getByText("Next: 10:00")).toBeTruthy();
        });

        it("calls onUseShuttleChange(true) when unchecked shuttle checkbox is toggled", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const onUseShuttleChange = jest.fn();
            const { getByTestId } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    useShuttle={false}
                    onUseShuttleChange={onUseShuttleChange}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByTestId("shuttle.checkbox"));
            expect(onUseShuttleChange).toHaveBeenCalledWith(true);
        });

        it("calls onUseShuttleChange(false) when checked shuttle checkbox is toggled", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const onUseShuttleChange = jest.fn();
            const { getByTestId } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    useShuttle={true}
                    onUseShuttleChange={onUseShuttleChange}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByTestId("shuttle.checkbox"));
            expect(onUseShuttleChange).toHaveBeenCalledWith(false);
        });

        it("shows a tick (✓) inside the checkbox when useShuttle is true", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    useShuttle={true}
                    defaultExpanded={true}
                />
            );
            expect(getByText("✓")).toBeTruthy();
        });
    });

    describe("Transport mode selector", () => {
        it("renders all four transport mode buttons", () => {
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
            expect(getByText("Driving")).toBeTruthy();
            expect(getByText("Walking")).toBeTruthy();
            expect(getByText("Cycling")).toBeTruthy();
            expect(getByText("Transit")).toBeTruthy();
        });

        it("calls onChangeTransportMode when a transport mode button is pressed", () => {
            const onChangeTransportMode = jest.fn();
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    onChangeTransportMode={onChangeTransportMode}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByText("Driving"));
            expect(onChangeTransportMode).toHaveBeenCalledWith("DRIVING");
        });

        it("clears shuttle when switching away from TRANSIT", () => {
            mockShuttleAvailability.mockReturnValue(shuttleAvailableResult);
            const onUseShuttleChange = jest.fn();
            const { getByText } = render(
                <SearchBar
                    {...defaultProps}
                    transportMode="TRANSIT"
                    useShuttle={true}
                    onUseShuttleChange={onUseShuttleChange}
                    defaultExpanded={true}
                />
            );
            fireEvent.press(getByText("Walking"));
            expect(onUseShuttleChange).toHaveBeenCalledWith(false);
        });
    });

    describe("Empty history state", () => {
        it("shows 'No recent destinations yet' when history is empty", () => {
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
            expect(getByText("No recent destinations yet")).toBeTruthy();
        });

        it("shows 'Suggested Buildings' section header", () => {
            const { getByText } = render(
                <SearchBar {...defaultProps} defaultExpanded={true} />
            );
            expect(getByText("Suggested Buildings")).toBeTruthy();
        });

        it("shows a building in history after it has been selected as destination", async () => {
            const onChangeDestination = jest.fn();
            const { getByPlaceholderText, getByText, queryByText } = render(
                <SearchBar {...defaultProps} onChangeDestination={onChangeDestination} defaultExpanded={true} />
            );

            // Initially empty
            expect(getByText("No recent destinations yet")).toBeTruthy();

            // Search and select
            const destInput = getByPlaceholderText("Where to?");
            fireEvent(destInput, "focus");
            fireEvent.changeText(destInput, "Hall");

            await waitFor(() => expect(getByText(/Henry F. Hall Building \(H\)/)).toBeTruthy());
            fireEvent.press(getByText(/Henry F. Hall Building \(H\)/));

            // Should now appear in the history list
            await waitFor(() => {
                expect(queryByText("No recent destinations yet")).toBeNull();
            });
        });
    });

});