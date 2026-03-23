import React from "react";
import { render } from "@testing-library/react-native";
import NotFoundScreen from "../app/+not-found";

const mockLink = jest.fn();
const mockScreen = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Link: (props: any) => {
      mockLink(props);
      return React.createElement(Text, null, props.children);
    },
    Stack: {
      Screen: (props: any) => {
        mockScreen(props);
        return null;
      },
    },
  };
});

describe("NotFoundScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets the screen title", () => {
    render(<NotFoundScreen />);

    expect(mockScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { title: "Oops! Not Found" },
      }),
    );
  });

  it("renders a link to the home screen", () => {
    const { getByText } = render(<NotFoundScreen />);

    expect(getByText("Go back to Home screen!")).toBeTruthy();
    expect(mockLink).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "/",
      }),
    );
  });
});