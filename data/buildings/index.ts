// This is the central campus data gateway
// this file combines the data from all buildings into a single array
// its fed into indoorPathfinder to calcualte the routes across the entire campus meow
import { HallData } from './H';
import { MBData } from './MB';
import { CCData } from './CC';
import { VLData } from './VL';

export const AllCampusData = [
  ...HallData,
  ...MBData,
  ...CCData,
  ...VLData,
];
