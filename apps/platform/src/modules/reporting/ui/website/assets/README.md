# Namibia regional boundaries

`namibia-regions.json` is imported boundary data, not handwritten chart geometry.
It is registered as GeoJSON with Apache ECharts in `NamibiaVisitorMapData.ts`
and rendered by `NamibiaVisitorMap.tsx` as a choropleth with regional scatter markers.

Source: Namibia Statistics Agency (NSA), distributed by [HDX](https://data.humdata.org/dataset/cod-ab-nam)
and the [geoBoundaries gbHumanitarian release](https://github.com/wmgeolab/geoBoundaries/tree/9469f09/releaseData/gbHumanitarian/NAM/ADM1).
License: [Creative Commons Attribution 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/).
Boundary ID: `NAM-ADM1-65246180`. Downloaded 2026-10-06 from the pinned
[simplified GeoJSON](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/NAM/ADM1/geoBoundaries-NAM-ADM1_simplified.geojson).

The upstream metadata reports a represented year of 2011, source update
2023-01-19 and build 2023-12-12. The actual asset contains fourteen unique
regional keys, including Kavango East, Kavango West and Zambezi. The upstream
represented-year inconsistency is retained here; this is not a claim of a new
boundary survey. The fourteen keys and Namibia geographic bounds are checked
in `WebsiteAnalyticsPresentation.test.tsx`.

Transformation: polygon winding was normalized to D3's spherical convention
by reversing exterior/interior ring order together where the exterior represented
the complementary globe. Coordinates and feature properties were retained.
JSON whitespace was removed. The source key `Karas` is displayed as `//Karas`;
this display mapping does not introduce a GA provider alias. Provider aliases
must be verified against the configured property's live Namibia region results.

Attribution appears below the map. Unknown GA regions
remain in the source totals and share denominator; they are not assigned to polygons.
The geography table was removed at the user's request. Hovering or selecting a
mapped region displays its recorded user count, or “No data”.

ECharts renders all fourteen boundaries with SVG even when visitor data is empty.
Region fill values and scatter-marker sizes use the same recorded region counts.
ECharts derives the marker centres from the sourced polygons; they represent
regional totals rather than individual visitor locations. Both series share one
geo projection, following the official `geo-choropleth-scatter` example. The map
supports drag/scroll zoom and requires no WebGL, workers, API key or external tiles.
