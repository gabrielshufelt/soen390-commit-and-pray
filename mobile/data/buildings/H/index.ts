// This is the hall building "data barrel", it gathers all floor specific navigation graphs for the hall building specifically
// When and if we add a new floor, we need to import the json and add it here.
import h1 from './H1-nav.json';
import h2 from './H2-nav.json';
import h8 from './H8-nav.json';
import h9 from './H9-nav.json';

export const HallData = [h1, h2, h8, h9];
