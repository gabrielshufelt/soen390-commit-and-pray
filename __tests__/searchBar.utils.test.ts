import {
  stripCodePrefix,
  displayName,
  makeHaystack,
} from "../constants/searchBar.utils";
import type { BuildingChoice } from "../constants/searchBar.types";

describe("searchBar.utils", () => {
  describe("stripCodePrefix", () => {
    it("returns the trimmed name when code is missing", () => {
      expect(stripCodePrefix("  Henry F. Hall Building  ")).toBe(
        "Henry F. Hall Building"
      );
    });

    it("removes the code prefix followed by a dash", () => {
      expect(stripCodePrefix("H - Henry F. Hall Building", "H")).toBe(
        "Henry F. Hall Building"
      );
    });

    it("removes the code prefix followed by an em dash", () => {
      expect(stripCodePrefix("MB—John Molson School of Business", "MB")).toBe(
        "John Molson School of Business"
      );
    });

    it("removes the code prefix followed by a colon", () => {
      expect(stripCodePrefix("AD: Administration Building", "AD")).toBe(
        "Administration Building"
      );
    });

    it("does not modify the name when the prefix does not match", () => {
      expect(stripCodePrefix("Henry F. Hall Building", "H")).toBe(
        "Henry F. Hall Building"
      );
    });

    it("returns an empty string when name is empty and code is missing", () => {
      expect(stripCodePrefix("", undefined)).toBe("");
    });

    it("returns an empty string when name is nullish and code is provided", () => {
      expect(stripCodePrefix(undefined as unknown as string, "H")).toBe("");
    });

    it("matches the code prefix case-insensitively", () => {
      expect(stripCodePrefix("h - Henry F. Hall Building", "H")).toBe(
        "Henry F. Hall Building"
      );
    });
  });

  describe("displayName", () => {
    it("returns the cleaned name with the code appended when code exists", () => {
      expect(
        displayName({
          name: "H - Henry F. Hall Building",
          code: "H",
        })
      ).toBe("Henry F. Hall Building (H)");
    });

    it("returns only the cleaned name when code is missing", () => {
      expect(
        displayName({
          name: "  Henry F. Hall Building  ",
        })
      ).toBe("Henry F. Hall Building");
    });
  });

  describe("makeHaystack", () => {
    it("builds a lowercase searchable string with cleaned name, code, and address", () => {
      const building: BuildingChoice = {
        id: "1",
        name: "H - Henry F. Hall Building",
        code: "H",
        address: "1455 De Maisonneuve Blvd. W.",
        coordinate: { latitude: 45.497, longitude: -73.579 },
        campus: "SGW",
      };

      expect(makeHaystack(building)).toBe(
        "henry f. hall building h 1455 de maisonneuve blvd. w."
      );
    });

    it("falls back to empty strings for missing code and address", () => {
      const building = {
        id: "2",
        name: "Library Building",
        coordinate: { latitude: 45.5, longitude: -73.6 },
        campus: "SGW",
      } as BuildingChoice;

      expect(makeHaystack(building)).toBe("library building  ");
    });
  });
});