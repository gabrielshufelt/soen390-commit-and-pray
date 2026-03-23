import { renderHook } from "@testing-library/react-native";
import shuttleData from "../data/shuttleSchedule.json";
import {
  timeToMinutes,
  getDepartureTimes,
  findNextDeparture,
  useShuttleAvailability,
} from "../hooks/useShuttleAvailability";

describe("useShuttleAvailability helpers", () => {
  describe("timeToMinutes", () => {
    it("converts a normal HH:MM time to minutes", () => {
      expect(timeToMinutes("09:30")).toBe(570);
    });

    it("strips trailing asterisk before converting", () => {
      expect(timeToMinutes("23:15*")).toBe(1395);
    });

    it("returns NaN for invalid input", () => {
      expect(Number.isNaN(timeToMinutes("invalid"))).toBe(true);
    });
  });

  describe("getDepartureTimes", () => {
    it("returns no departures on Sunday", () => {
      const sunday = new Date("2026-03-15T10:00:00");
      expect(getDepartureTimes("SGW", sunday)).toEqual([]);
    });

    it("returns no departures on Saturday", () => {
      const saturday = new Date("2026-03-14T10:00:00");
      expect(getDepartureTimes("Loyola", saturday)).toEqual([]);
    });

    it("returns monday-thursday SGW departures on a Monday", () => {
      const monday = new Date("2026-03-16T10:00:00");
      expect(getDepartureTimes("SGW", monday)).toEqual(
        shuttleData.schedules.mondayToThursday.sgwDepartures
      );
    });

    it("returns monday-thursday Loyola departures on a Thursday", () => {
      const thursday = new Date("2026-03-19T10:00:00");
      expect(getDepartureTimes("Loyola", thursday)).toEqual(
        shuttleData.schedules.mondayToThursday.loyolaDepartures
      );
    });

    it("returns friday SGW departures on Friday", () => {
      const friday = new Date("2026-03-20T10:00:00");
      expect(getDepartureTimes("SGW", friday)).toEqual(
        shuttleData.schedules.friday.sgwDepartures
      );
    });

    it("returns friday Loyola departures on Friday", () => {
      const friday = new Date("2026-03-20T10:00:00");
      expect(getDepartureTimes("Loyola", friday)).toEqual(
        shuttleData.schedules.friday.loyolaDepartures
      );
    });
  });

  describe("findNextDeparture", () => {
    it("returns the first departure that is at or after now", () => {
      expect(findNextDeparture(["09:00", "10:30", "11:00"], 630)).toBe("10:30");
    });

    it("returns the same time when a departure matches now exactly", () => {
      expect(findNextDeparture(["09:00", "10:30", "11:00"], 630)).toBe("10:30");
    });

    it("skips invalid times and finds the next valid departure", () => {
      expect(findNextDeparture(["bad", "11:15*", "12:00"], 660)).toBe("11:15");
    });

    it("returns null when all departures are in the past", () => {
      expect(findNextDeparture(["08:00", "09:00"], 600)).toBeNull();
    });

    it("returns null when there are no departures", () => {
      expect(findNextDeparture([], 600)).toBeNull();
    });
  });
});

describe("useShuttleAvailability", () => {
  const RealDate = Date;

  function mockDate(iso: string) {
    global.Date = class extends RealDate {
      constructor(value?: string | number | Date) {
        super(value ?? iso);
      }

      static now() {
        return new RealDate(iso).getTime();
      }
    } as DateConstructor;
  }

  afterEach(() => {
    global.Date = RealDate;
  });

  it("returns unavailable with no next departure on weekends", () => {
    mockDate("2026-03-14T10:00:00");

    const { result } = renderHook(() => useShuttleAvailability("SGW"));

    expect(result.current).toEqual({
      available: false,
      nextDeparture: null,
    });
  });

  it("returns available with the next departure when one is still upcoming", () => {
    mockDate("2026-03-16T09:00:00");

    const { result } = renderHook(() => useShuttleAvailability("SGW"));

    expect(result.current.available).toBe(true);
    expect(result.current.nextDeparture).not.toBeNull();
  });

  it("returns unavailable when all departures for today have passed", () => {
    mockDate("2026-03-20T23:59:00");

    const { result } = renderHook(() => useShuttleAvailability("Loyola"));

    expect(result.current).toEqual({
      available: false,
      nextDeparture: null,
    });
  });
});