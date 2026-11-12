# Third-party assets

Everything is bundled at build time; nothing is fetched from another host at runtime.

| Asset | Where it is used | Source | Licence |
|---|---|---|---|
| Land polygons (`world-atlas/land-110m.json`, npm `world-atlas@2.0.2`) | Earth texture in Mission Control, drawn on a canvas by `web/src/pages/mission-control/earthTexture.ts` | Natural Earth 1:110m land, packaged by Mike Bostock (topojson/world-atlas) | Natural Earth data: public domain. Package: ISC |
| `topojson-client@3.1.0` | Converts the TopoJSON above to GeoJSON | topojson/topojson-client | ISC |
| DSN complex coordinates (`data/reference/dsn_complexes.json`) | Placement of Goldstone, Canberra and Madrid | Public, approximate geographic centres of the NASA Deep Space Network complexes | Public information |
| BEE logo (`web/public/brand/bee-logo.png`) | Nav bar, landing page, favicon | The team (byte-identical copy of `BEE.png`) | Team's own |

Not used: no satellite imagery, no NASA Blue Marble texture, no web fonts, no hotlinked images.
Spacecraft and dish models are procedural (built from three.js primitives in code) and are
generic illustrative shapes, not models of real spacecraft.
