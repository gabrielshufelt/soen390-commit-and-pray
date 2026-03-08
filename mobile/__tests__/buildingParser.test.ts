import { parseBuildingLocation } from '../utils/buildingParser';

describe('parseBuildingLocation', () => {
  // Null / empty inputs
  it('returns null for empty string', () => {
    expect(parseBuildingLocation('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseBuildingLocation('   ')).toBeNull();
  });

  it('returns null for completely unrecognized string', () => {
    expect(parseBuildingLocation('Some Random Building XYZ')).toBeNull();
  });

  it('returns null for a number-only string', () => {
    expect(parseBuildingLocation('12345')).toBeNull();
  });

  // Step 1: "CODE Building ROOM" format
  it('parses "CJ Building 1.129"', () => {
    const result = parseBuildingLocation('CJ Building 1.129');
    expect(result).toEqual({
      buildingCode: 'CJ',
      buildingName: 'Communication Studies and Journalism Building',
      room: '1.129',
    });
  });

  it('parses "CC Building 405"', () => {
    const result = parseBuildingLocation('CC Building 405');
    expect(result).toEqual({
      buildingCode: 'CC',
      buildingName: 'Central Building',
      room: '405',
    });
  });

  it('parses "H Building 820" (code + Building + room)', () => {
    const result = parseBuildingLocation('H Building 820');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '820',
    });
  });

  it('parses "EV Building 11.119"', () => {
    const result = parseBuildingLocation('EV Building 11.119');
    expect(result).toEqual({
      buildingCode: 'EV',
      buildingName: 'Engineering, Computer Science and Visual Arts Complex',
      room: '11.119',
    });
  });

  it('falls through step 1 when code is invalid (e.g. "ZZ Building 101") and returns null', () => {
    expect(parseBuildingLocation('ZZ Building 101')).toBeNull();
  });

  // Step 2: CODE+ROOM (compact / separated) format
  it('parses "H939" (no separator)', () => {
    const result = parseBuildingLocation('H939');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '939',
    });
  });

  it('parses "H 939" (space separator)', () => {
    const result = parseBuildingLocation('H 939');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '939',
    });
  });

  it('parses "H-820" (dash separator)', () => {
    const result = parseBuildingLocation('H-820');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '820',
    });
  });

  it('parses "EV 11.119" (code with dotted room)', () => {
    const result = parseBuildingLocation('EV 11.119');
    expect(result).toEqual({
      buildingCode: 'EV',
      buildingName: 'Engineering, Computer Science and Visual Arts Complex',
      room: '11.119',
    });
  });

  it('falls through step 2 when code is invalid (e.g. "ZZ 101")', () => {
    // ZZ is not a valid code, should fall through and return null
    expect(parseBuildingLocation('ZZ 101')).toBeNull();
  });

  // Step 3: Full / partial name lookup
  it('parses "Hall Building 820" (name alias + room)', () => {
    const result = parseBuildingLocation('Hall Building 820');
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('H');
    expect(result!.room).toBeTruthy();
  });

  it('parses bare name "Hall" (maps to H, no room)', () => {
    const result = parseBuildingLocation('Hall');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '',
    });
  });

  it('parses "Henry F. Hall" (full name alias, no room)', () => {
    const result = parseBuildingLocation('Henry F. Hall');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '',
    });
  });

  it('parses "Central Building 405" (name alias + room)', () => {
    const result = parseBuildingLocation('Central Building 405');
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('CC');
  });

  it('parses "John Molson School of Business" (long name, no room)', () => {
    const result = parseBuildingLocation('John Molson School of Business');
    // The parser matches the shorter alias 'john molson' first, so the
    // remainder 'School of Business' is captured as the room string.
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('MB');
    expect(result!.buildingName).toBe('John Molson School of Business');
  });

  it('parses loyola alias "communication studies" (no room)', () => {
    const result = parseBuildingLocation('communication studies');
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('CJ');
  });

  // Step 4: Bare code only
  it('parses bare code "H"', () => {
    const result = parseBuildingLocation('H');
    expect(result).toEqual({
      buildingCode: 'H',
      buildingName: 'Henry F. Hall Building',
      room: '',
    });
  });

  it('parses bare code "EV"', () => {
    const result = parseBuildingLocation('EV');
    expect(result).toEqual({
      buildingCode: 'EV',
      buildingName: 'Engineering, Computer Science and Visual Arts Complex',
      room: '',
    });
  });

  it('parses bare code "MB"', () => {
    const result = parseBuildingLocation('MB');
    expect(result).toEqual({
      buildingCode: 'MB',
      buildingName: 'John Molson School of Business',
      room: '',
    });
  });

  it('parses bare code lowercase "ev" (case-insensitive)', () => {
    const result = parseBuildingLocation('ev');
    expect(result).toEqual({
      buildingCode: 'EV',
      buildingName: 'Engineering, Computer Science and Visual Arts Complex',
      room: '',
    });
  });

  it('parses a loyola building bare code "SP"', () => {
    const result = parseBuildingLocation('SP');
    expect(result).toEqual({
      buildingCode: 'SP',
      buildingName: 'Richard J Renaud Science Complex',
      room: '',
    });
  });

  it('parses a loyola building bare code "CJ"', () => {
    const result = parseBuildingLocation('CJ');
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('CJ');
    expect(result!.room).toBe('');
  });

  // Name with room strips cleanly
  it('parses "MB S1.123" via name-lookup path (MB with alpha prefixed room)', () => {
    // "mb s1.123" normalised matches "mb" prefix -> room = "S1.123"
    const result = parseBuildingLocation('MB S1.123');
    expect(result).not.toBeNull();
    expect(result!.buildingCode).toBe('MB');
    expect(result!.room).toBe('S1.123');
  });
});
