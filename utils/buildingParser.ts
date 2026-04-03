import type { BuildingChoice } from "@/constants/searchBar.types";

// Parses a Concordia building + room location string (typically from a Google
// Calendar event's LOCATION field) into a structured { buildingCode, buildingName, room }.

// Handles every common format seen in Concordia ICS exports and manual entries:
// "CJ Building 1.129"   -> { code: "CJ", name: "Communication Studies and Journalism Building", room: "1.129" }
// "CC Building 405"     -> { code: "CC", name: "Central Building", room: "405" }
// "H939"                -> { code: "H",  name: "Henry F. Hall Building", room: "939" }
// "H 939"               -> { code: "H",  name: "Henry F. Hall Building", room: "939" }
// "H-820"               -> { code: "H",  name: "Henry F. Hall Building", room: "820" }
// "Hall Building 820"   -> { code: "H",  name: "Henry F. Hall Building", room: "820" }
// "Henry F. Hall"       -> { code: "H",  name: "Henry F. Hall Building", room: "" }
// "EV 11.119"           -> { code: "EV", name: "...", room: "11.119" }
// "MB S1.123"           -> { code: "MB", name: "...", room: "S1.123" }
export interface ParsedLocation {
  buildingCode: string;
  buildingName: string;
  room: string;
}

// Building registry
// Maps every known name variant (lowercase) -> canonical building code.
// Add entries here if new aliases are encountered.
const NAME_TO_CODE: Record<string, string> = {
  // SGW Campus
  'henry f. hall': 'H',
  'henry f hall': 'H',
  'hall': 'H',
  'hall building': 'H',
  'j. w. mcconnell': 'LB',
  'j w mcconnell': 'LB',
  'mcconnell': 'LB',
  'library': 'LB',
  'library building': 'LB',
  'lb': 'LB',
  'john molson': 'MB',
  'john molson school of business': 'MB',
  'jmsb': 'MB',
  'molson': 'MB',
  'mb': 'MB',
  'guy metro': 'GM',
  'guy-metro': 'GM',
  'gm': 'GM',
  'td bank': 'TD',
  'td': 'TD',
  'le faubourg': 'FG',
  'faubourg': 'FG',
  'fg': 'FG',
  'faubourg tower': 'FB',
  'fb': 'FB',
  'engineering': 'EV',
  'ev building': 'EV',
  'engineering, computer science and visual arts': 'EV',
  'engineering computer science and visual arts': 'EV',
  'ev': 'EV',
  'visual arts': 'VA',
  'va': 'VA',
  'learning square': 'LS',
  'concordia learning square': 'LS',
  'ls': 'LS',
  'grey nuns': 'GN',
  'maison-mère': 'GN',
  'gn': 'GN',

  // Loyola Campus
  'richard j renaud': 'SP',
  'renaud': 'SP',
  'science complex': 'SP',
  'sp': 'SP',
  'f.c. smith': 'FC',
  'fc smith': 'FC',
  'fc': 'FC',
  'recreation': 'RA',
  'athletics': 'RA',
  'ed meagher': 'RA',
  'ra': 'RA',
  'physical services': 'PS',
  'ps': 'PS',
  'communication studies': 'CJ',
  'journalism': 'CJ',
  'communication studies and journalism': 'CJ',
  'cj': 'CJ',
  'student centre': 'SC',
  'sc': 'SC',
  'jesuit residence': 'JR',
  'jr': 'JR',
  'solar house': 'SH',
  'sh': 'SH',
  'terrebonne': 'TA',
  'ta': 'TA',
  'genomics': 'GE',
  'structural and functional genomics': 'GE',
  'ge': 'GE',
  'perform': 'PC',
  'perform centre': 'PC',
  'pc': 'PC',
  'hingston': 'HC',
  'hc': 'HC',
  'bb annex': 'BB',
  'bb': 'BB',
  'bh annex': 'BH',
  'bh': 'BH',
  'oscar peterson': 'PT',
  'concert hall': 'PT',
  'pt': 'PT',
  'loyola jesuit': 'RF',
  'jesuit hall': 'RF',
  'rf': 'RF',
  'central building': 'CC',
  'cc': 'CC',
  'administration': 'AD',
  'ad': 'AD',
  'applied science hub': 'HU',
  'hu': 'HU',
  'vanier library': 'VL',
  'vanier': 'VL',
  'vl': 'VL',
  'cl building': 'CL',
  'cl': 'CL',
};

// Maps building code -> canonical full name
const CODE_TO_NAME: Record<string, string> = {
  H: 'Henry F. Hall Building',
  LB: 'J. W. McConnell Building (Library)',
  MB: 'John Molson School of Business',
  GM: 'Guy Metro Building',
  TD: 'TD Bank Building',
  FG: 'Le Faubourg',
  FB: 'Faubourg Tower',
  EV: 'Engineering, Computer Science and Visual Arts Complex',
  VA: 'Visual Arts Building',
  LS: 'Concordia Learning Square',
  GN: 'Grey Nuns Residence',
  SP: 'Richard J Renaud Science Complex',
  FC: 'F.C. Smith Building',
  RA: 'Recreation and Athletics Complex',
  PS: 'Physical Services',
  CJ: 'Communication Studies and Journalism Building',
  SC: 'Student Centre',
  JR: 'Jesuit Residence',
  SH: 'Solar House',
  TA: 'Concordia Terrebonne Building',
  GE: 'Centre for Structural and Functional Genomics',
  PC: 'PERFORM Centre',
  HC: 'Hingston Hall',
  BB: 'Concordia BB Annex',
  BH: 'Concordia BH Annex',
  PT: 'Oscar Peterson Concert Hall',
  RF: 'Loyola Jesuit Hall and Conference Center',
  CC: 'Central Building',
  AD: 'Administration Building',
  HU: 'Applied Science Hub',
  VL: 'Concordia Vanier Library',
  CL: 'CL Building',
};

// Set of valid building codes for direct matching (uppercase)
const VALID_CODES = new Set(Object.keys(CODE_TO_NAME));

export function buildRouteRaw(choice: BuildingChoice | null): string {
  if (!choice?.code) return "";
  if (choice.room?.trim()) return `${choice.code} ${choice.room.trim()}`;
  return choice.code;
}

function makeResult(code: string, room: string): ParsedLocation {
  return { buildingCode: code, buildingName: CODE_TO_NAME[code], room };
}

// "CJ Building 1.129", "H Building 820", "EV Building 11.119"
function matchBuildingKeyword(raw: string): ParsedLocation | null {
  const m = new RegExp(/^([A-Za-z]{1,3})\s+[Bb]uilding\s+([A-Za-z0-9._-]+)/).exec(raw);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return VALID_CODES.has(code) ? makeResult(code, m[2]) : null;
}

// "H939", "H 939", "H-820", "EV 11.119"
function matchCodePlusRoom(raw: string): ParsedLocation | null {
  const m = new RegExp(/^([A-Za-z]{1,3})[\s-]?(\d[A-Za-z0-9._-]*)$/).exec(raw);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return VALID_CODES.has(code) ? makeResult(code, m[2]) : null;
}

// "H H_F1_room_18", "MB MB_F1_elevator_1", "VL VL_F1_room_39"
function matchIndoorNodeId(raw: string): ParsedLocation | null {
  const m = new RegExp(/^([A-Za-z]{1,3})\s+([A-Za-z0-9][A-Za-z0-9._]*_[A-Za-z0-9._-]+)$/).exec(raw);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return VALID_CODES.has(code) ? makeResult(code, m[2]) : null;
}

// "Hall Building 820", "Henry F. Hall", "Central Building 405"
function matchBuildingName(raw: string): ParsedLocation | null {
  const normalised = raw.toLowerCase().replaceAll(/[.,]/g, '').replaceAll(/\s+/g, ' ').trim();
  for (const [namePart, code] of Object.entries(NAME_TO_CODE)) {
    if (normalised === namePart) return makeResult(code, '');
    if (normalised.startsWith(namePart + ' ')) {
      const room = raw.slice(namePart.length).trim().replace(/^[\s,-]+/, '').trim();
      return makeResult(code, room);
    }
  }
  return null;
}

// "H", "EV", "MB"
function matchBareCode(raw: string): ParsedLocation | null {
  const code = raw.toUpperCase().trim();
  return VALID_CODES.has(code) ? makeResult(code, '') : null;
}

// Parse a Concordia raw location string from a calendar event.
export function parseBuildingLocation(location: string): ParsedLocation | null {
  if (!location || location.trim() === '') return null;
  const raw = location.trim();
  return (
    matchBuildingKeyword(raw) ??
    matchCodePlusRoom(raw) ??
    matchIndoorNodeId(raw) ??
    matchBuildingName(raw) ??
    matchBareCode(raw)
  );
}
