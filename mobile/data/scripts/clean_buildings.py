import geojson
import json

# the raw data for these buildings was extracted using the OpenStreetMap's Overpass API from https://overpass-turbo.eu/
# the following query was used to extract the campus building data into a geojson file:
#
# [out:json];
# (
#   // SGW campus (downtown)
#   way
#     ["building"~"university", i]
#     ["ref"]
#     (around:600,45.4973,-73.5790);

#   // Loyola campus
#   way
#     ["building"~"university", i]
#     (around:600,45.4582,-73.6405);
# );
# out geom;

def extract_loyola_building_codes():
    gj = get_gj("../buildings/raw/loyola.geojson")

    for f in gj['features']:
        name = f['properties'].get('name', '')
        if '(' in name and ')' in name:
            code = name[name.rfind('(') + 1:name.rfind(')')]
            f['properties']['code'] = code

    with open("../buildings/loyola.json", 'w') as f:
        json.dump(gj, f, indent=2)

def extract_sgw_building_codes():
    gj = get_gj("../buildings/raw/sgw.geojson")

    for f in gj['features']:
        ref = f['properties'].get('ref')
        if ref:
            f['properties']['code'] = ref

    with open("../buildings/sgw.json", 'w') as f:
        json.dump(gj, f, indent=2)

def get_gj(dir):
    with open(dir) as f:
        gj = geojson.load(f)

    return gj

extract_loyola_building_codes()
extract_sgw_building_codes()