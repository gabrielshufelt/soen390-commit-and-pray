import React from "react";
import { render } from "@testing-library/react-native";
import TabLayout from "../app/(tabs)/_layout";
import { useTheme } from "../context/ThemeContext";

const mockTabs = jest.fn();
const mockScreen = jest.fn();

jest.mock("../context/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("expo-router", () => ({
  Tabs: Object.assign(
    (props: any) => {
      mockTabs(props);
      return props.children;
    },
    {
      Screen: (props: any) => {
        mockScreen(props);
        return null;
      },
    }
  ),
}));

describe("TabLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders light theme tab and header colors", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];

    expect(tabsProps.screenOptions).toEqual(
      expect.objectContaining({
        tabBarStyle: { backgroundColor: "#ffffff" },
        tabBarActiveTintColor: "#007aff",
        tabBarInactiveTintColor: "#8e8e93",
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#000000",
      })
    );

    expect(mockScreen).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: "index",
        options: expect.objectContaining({ title: "Map" }),
      })
    );

    expect(mockScreen).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: "nearby",
        options: expect.objectContaining({ title: "Nearby" }),
      })
    );

    expect(mockScreen).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        name: "settings",
        options: expect.objectContaining({ title: "Settings" }),
      })
    );
  });

  it("renders dark theme tab and header colors", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];

    expect(tabsProps.screenOptions).toEqual(
      expect.objectContaining({
        tabBarStyle: { backgroundColor: "#1c1c1e" },
        tabBarActiveTintColor: "#0a84ff",
        tabBarInactiveTintColor: "#8e8e93",
        headerStyle: { backgroundColor: "#1c1c1e" },
        headerTintColor: "#ffffff",
      })
    );
  });
});