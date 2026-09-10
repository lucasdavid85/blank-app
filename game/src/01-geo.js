/* 01-geo.js
   Local tangent-plane projection: WGS84 <-> metres around the campus centroid.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

"use strict";

/* ═══════════════ 1. GEODESY ═══════════════
   Local tangent plane at the campus centre. x = east (m), y = north (m).
   Three.js world is x = east, y = up, z = -north.                      */

const ORIGIN = { lat: 43.7168261, lon: 7.2682908 };  // centroid of the real campus polygon
const M_LAT = 111132;
const M_LON = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
const toLocal = (lon, lat) => [(lon - ORIGIN.lon) * M_LON, (lat - ORIGIN.lat) * M_LAT];
const toLonLat = (x, y) => [ORIGIN.lon + x / M_LON, ORIGIN.lat + y / M_LAT];

const HALF = 440;                       // world extent, metres from origin
const BBOX = {                          // for the Overpass / IGN requests
  s: ORIGIN.lat - HALF / M_LAT, n: ORIGIN.lat + HALF / M_LAT,
  w: ORIGIN.lon - HALF / M_LON, e: ORIGIN.lon + HALF / M_LON
};
