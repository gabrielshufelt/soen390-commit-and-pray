// This is the hall building "data barrel", it gathers all floor specific navigation graphs for the hall building specifically
// When and if we add a new floor, we need to import the json and add it here.
import h1 from './1-nav.json';
import h2 from './2-nav.json';
import h8 from './8-nav.json';
import h9 from './9-nav.json';

export const HallData = [h1, h2, h8, h9];
