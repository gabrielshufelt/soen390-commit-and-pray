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

  it("renders all three screen tabs in correct order", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    expect(mockScreen).toHaveBeenCalledTimes(3);
    expect(mockScreen).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: "index" }));
    expect(mockScreen).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: "nearby" }));
    expect(mockScreen).toHaveBeenNthCalledWith(3, expect.objectContaining({ name: "settings" }));
  });

  it("renders Map tab with home icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    expect(mapTabOptions.title).toBe("Map");
    expect(mapTabOptions.tabBarIcon).toBeDefined();
  });

  it("renders Nearby tab with star icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const nearbyTabOptions = mockScreen.mock.calls[1][0].options;
    expect(nearbyTabOptions.title).toBe("Nearby");
    expect(nearbyTabOptions.tabBarIcon).toBeDefined();
  });

  it("renders Settings tab with gear icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const settingsTabOptions = mockScreen.mock.calls[2][0].options;
    expect(settingsTabOptions.title).toBe("Settings");
    expect(settingsTabOptions.tabBarIcon).toBeDefined();
  });

  it("tab icons render correctly with active/inactive colors", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    const mapIconComponent = mapTabOptions.tabBarIcon({ color: "#007aff", size: 24 });
    expect(mapIconComponent).toBeDefined();

    const inactiveIconComponent = mapTabOptions.tabBarIcon({ color: "#8e8e93", size: 24 });
    expect(inactiveIconComponent).toBeDefined();
  });

  it("All tabs have screenOptions using theme colors", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    for (let i = 0; i < 3; i++) {
      const screenOptions = mockScreen.mock.calls[i][0].options;
      expect(screenOptions).toBeDefined();
      expect(screenOptions.title).toBeDefined();
    }
  });

  it("dark theme affects icon colors correctly", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    const activeIcon = mapTabOptions.tabBarIcon({ color: "#0a84ff", size: 24 });
    const inactiveIcon = mapTabOptions.tabBarIcon({ color: "#8e8e93", size: 24 });

    expect(activeIcon).toBeDefined();
    expect(inactiveIcon).toBeDefined();
  });

  it("screen options are consistent across light and dark themes", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });
    render(<TabLayout />);
    const lightScreenCount = mockScreen.mock.calls.length;

    jest.clearAllMocks();

    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });
    render(<TabLayout />);
    const darkScreenCount = mockScreen.mock.calls.length;

    expect(lightScreenCount).toBe(darkScreenCount);
  });

  it("Tabs component receives correct props structure", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps).toHaveProperty("screenOptions");
    expect(tabsProps).toHaveProperty("children");
  });

  it("screenOptions includes required styling properties", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    const screenOptions = tabsProps.screenOptions;

    expect(screenOptions).toHaveProperty("tabBarStyle");
    expect(screenOptions).toHaveProperty("tabBarActiveTintColor");
    expect(screenOptions).toHaveProperty("tabBarInactiveTintColor");
    expect(screenOptions).toHaveProperty("headerStyle");
    expect(screenOptions).toHaveProperty("headerTintColor");
  });

  it("Map tab uses correct name for route navigation", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    expect(mockScreen.mock.calls[0][0].name).toBe("index");
  });

  it("Settings tab uses correct name for route navigation", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    expect(mockScreen.mock.calls[2][0].name).toBe("settings");
  });

  // ===== ENHANCED ICON RENDERING TESTS =====
  it("Map tab icon renders with FontAwesome map icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    const iconComponent = mapTabOptions.tabBarIcon({ color: "#007aff", size: 24 });
    
    expect(iconComponent).toBeDefined();
    expect(iconComponent?.props?.name).toBe("map");
    expect(iconComponent?.props?.size).toBe(24);
    expect(iconComponent?.props?.color).toBe("#007aff");
  });

  it("Nearby tab icon renders with FontAwesome star icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const nearbyTabOptions = mockScreen.mock.calls[1][0].options;
    const iconComponent = nearbyTabOptions.tabBarIcon({ color: "#007aff", size: 24 });
    
    expect(iconComponent).toBeDefined();
    expect(iconComponent?.props?.name).toBe("star");
    expect(iconComponent?.props?.size).toBe(24);
    expect(iconComponent?.props?.color).toBe("#007aff");
  });

  it("Settings tab icon renders with FontAwesome cog icon", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const settingsTabOptions = mockScreen.mock.calls[2][0].options;
    const iconComponent = settingsTabOptions.tabBarIcon({ color: "#007aff", size: 24 });
    
    expect(iconComponent).toBeDefined();
    expect(iconComponent?.props?.name).toBe("cog");
    expect(iconComponent?.props?.size).toBe(24);
    expect(iconComponent?.props?.color).toBe("#007aff");
  });

  it("tab icons render with different sizes correctly", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    
    const smallIcon = mapTabOptions.tabBarIcon({ color: "#007aff", size: 16 });
    expect(smallIcon?.props?.size).toBe(16);
    
    const largeIcon = mapTabOptions.tabBarIcon({ color: "#007aff", size: 32 });
    expect(largeIcon?.props?.size).toBe(32);
  });

  it("icons render with dark theme active color", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const mapTabOptions = mockScreen.mock.calls[0][0].options;
    const darkActiveIcon = mapTabOptions.tabBarIcon({ color: "#0a84ff", size: 24 });
    
    expect(darkActiveIcon).toBeDefined();
    expect(darkActiveIcon?.props?.color).toBe("#0a84ff");
  });

  it("icons render with inactive color correctly", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const nearbyTabOptions = mockScreen.mock.calls[1][0].options;
    const inactiveIcon = nearbyTabOptions.tabBarIcon({ color: "#8e8e93", size: 24 });
    
    expect(inactiveIcon).toBeDefined();
    expect(inactiveIcon?.props?.color).toBe("#8e8e93");
  });

  it("all tab icons are FontAwesome components", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    for (let i = 0; i < 3; i++) {
      const tabOptions = mockScreen.mock.calls[i][0].options;
      const icon = tabOptions.tabBarIcon({ color: "#007aff", size: 24 });
      
      expect(icon?.type?.displayName || icon?.type?.name).toBeDefined();
    }
  });

  it("light theme tab bar background is white", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.tabBarStyle.backgroundColor).toBe("#ffffff");
  });

  it("dark theme tab bar background is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.tabBarStyle.backgroundColor).toBe("#1c1c1e");
  });

  it("light theme header background is white", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.headerStyle.backgroundColor).toBe("#ffffff");
  });

  it("dark theme header background is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.headerStyle.backgroundColor).toBe("#1c1c1e");
  });

  it("light theme header tint color is black", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.headerTintColor).toBe("#000000");
  });

  it("dark theme header tint color is white", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.headerTintColor).toBe("#ffffff");
  });

  it("all tabs have defined icon properties", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const expectedIcons = ["map", "star", "cog"];
    
    for (let i = 0; i < 3; i++) {
      const tabOptions = mockScreen.mock.calls[i][0].options;
      const icon = tabOptions.tabBarIcon({ color: "#007aff", size: 24 });
      
      expect(icon?.props?.name).toBe(expectedIcons[i]);
    }
  });

  it("inactive tab color is consistent across themes", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });
    render(<TabLayout />);
    
    const lightTabsProps = mockTabs.mock.calls[0][0];
    const lightInactiveColor = lightTabsProps.screenOptions.tabBarInactiveTintColor;

    jest.clearAllMocks();

    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });
    render(<TabLayout />);
    
    const darkTabsProps = mockTabs.mock.calls[0][0];
    const darkInactiveColor = darkTabsProps.screenOptions.tabBarInactiveTintColor;

    expect(lightInactiveColor).toBe(darkInactiveColor);
    expect(lightInactiveColor).toBe("#8e8e93");
  });

  it("Nearby tab has correct route name", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    expect(mockScreen.mock.calls[1][0].name).toBe("nearby");
  });

  it("all tabs have text titles defined", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const titles = ["Map", "Nearby", "Settings"];
    
    for (let i = 0; i < 3; i++) {
      const tabOptions = mockScreen.mock.calls[i][0].options;
      expect(tabOptions.title).toBe(titles[i]);
    }
  });

  it("theme context hook is called", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    expect(useTheme).toHaveBeenCalled();
  });

  it("uses correct light theme active tint color", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "light" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.tabBarActiveTintColor).toBe("#007aff");
  });

  it("uses correct dark theme active tint color", () => {
    (useTheme as jest.Mock).mockReturnValue({ colorScheme: "dark" });

    render(<TabLayout />);

    const tabsProps = mockTabs.mock.calls[0][0];
    expect(tabsProps.screenOptions.tabBarActiveTintColor).toBe("#0a84ff");
  });
});