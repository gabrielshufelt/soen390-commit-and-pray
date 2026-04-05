import {
  matchPoiSearchCategory,
  POI_SEARCH_KEYWORDS,
  POI_CATEGORIES,
} from '../constants/poiCategories';

describe('POI_SEARCH_KEYWORDS', () => {
  it('maps coffee-related keywords to "coffee"', () => {
    expect(POI_SEARCH_KEYWORDS['coffee']).toBe('coffee');
    expect(POI_SEARCH_KEYWORDS['coffee shop']).toBe('coffee');
    expect(POI_SEARCH_KEYWORDS['coffee shops']).toBe('coffee');
    expect(POI_SEARCH_KEYWORDS['cafe']).toBe('coffee');
    expect(POI_SEARCH_KEYWORDS['cafes']).toBe('coffee');
  });

  it('maps restaurant-related keywords to "restaurant"', () => {
    expect(POI_SEARCH_KEYWORDS['restaurant']).toBe('restaurant');
    expect(POI_SEARCH_KEYWORDS['restaurants']).toBe('restaurant');
    expect(POI_SEARCH_KEYWORDS['food']).toBe('restaurant');
    expect(POI_SEARCH_KEYWORDS['dining']).toBe('restaurant');
  });

  it('maps grocery-related keywords to "grocery"', () => {
    expect(POI_SEARCH_KEYWORDS['grocery']).toBe('grocery');
    expect(POI_SEARCH_KEYWORDS['grocery store']).toBe('grocery');
    expect(POI_SEARCH_KEYWORDS['grocery stores']).toBe('grocery');
    expect(POI_SEARCH_KEYWORDS['groceries']).toBe('grocery');
    expect(POI_SEARCH_KEYWORDS['supermarket']).toBe('grocery');
  });

  it('maps study-related keywords to "study"', () => {
    expect(POI_SEARCH_KEYWORDS['study']).toBe('study');
    expect(POI_SEARCH_KEYWORDS['study space']).toBe('study');
    expect(POI_SEARCH_KEYWORDS['study spaces']).toBe('study');
    expect(POI_SEARCH_KEYWORDS['study area']).toBe('study');
    expect(POI_SEARCH_KEYWORDS['study areas']).toBe('study');
  });
});

describe('matchPoiSearchCategory', () => {
  it('returns the correct category for exact keyword matches', () => {
    expect(matchPoiSearchCategory('coffee')).toBe('coffee');
    expect(matchPoiSearchCategory('restaurant')).toBe('restaurant');
    expect(matchPoiSearchCategory('grocery store')).toBe('grocery');
    expect(matchPoiSearchCategory('study space')).toBe('study');
  });

  it('is case-insensitive', () => {
    expect(matchPoiSearchCategory('Coffee')).toBe('coffee');
    expect(matchPoiSearchCategory('RESTAURANT')).toBe('restaurant');
    expect(matchPoiSearchCategory('Grocery Store')).toBe('grocery');
    expect(matchPoiSearchCategory('Study Space')).toBe('study');
  });

  it('trims whitespace', () => {
    expect(matchPoiSearchCategory('  coffee  ')).toBe('coffee');
    expect(matchPoiSearchCategory('  restaurant  ')).toBe('restaurant');
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(matchPoiSearchCategory('')).toBeNull();
    expect(matchPoiSearchCategory('   ')).toBeNull();
  });

  it('returns null for non-matching queries', () => {
    expect(matchPoiSearchCategory('building')).toBeNull();
    expect(matchPoiSearchCategory('hall')).toBeNull();
    expect(matchPoiSearchCategory('xyz')).toBeNull();
    expect(matchPoiSearchCategory('coffee shop nearby')).toBeNull();
  });

  it('returns null for partial keyword matches', () => {
    expect(matchPoiSearchCategory('coff')).toBeNull();
    expect(matchPoiSearchCategory('rest')).toBeNull();
    expect(matchPoiSearchCategory('groc')).toBeNull();
  });
});

describe('POI_CATEGORIES', () => {
  it('has all four categories defined', () => {
    expect(POI_CATEGORIES.study).toBeDefined();
    expect(POI_CATEGORIES.coffee).toBeDefined();
    expect(POI_CATEGORIES.restaurant).toBeDefined();
    expect(POI_CATEGORIES.grocery).toBeDefined();
  });

  it('each category has title, icon, and color', () => {
    for (const cat of Object.values(POI_CATEGORIES)) {
      expect(cat).toHaveProperty('title');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
    }
  });
});
