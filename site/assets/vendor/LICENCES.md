# Vendored libraries

Every file in this directory is committed as a plain file the browser loads
directly. There is no npm at runtime, no bundler and no CDN link, so this list
is the only record of where these bytes came from and what licence they carry.

| File | Library | Version | Licence |
|---|---|---|---|
| `leaflet.js`, `leaflet.css`, `images/` | Leaflet | 1.9.x | BSD-2-Clause |
| `leaflet.markercluster.js`, `leaflet.markercluster.css` | Leaflet.markercluster | 1.5.3 | MIT |
| `chart.umd.js` | Chart.js | 4.x | MIT |
| `aos.js`, `aos.css` | AOS | 2.3.x | MIT |
| `countUp.umd.js` | CountUp.js | 2.x | MIT |
| `motion.min.js` | Motion One | 10.x | MIT |
| `tsparticles.bundle.min.js` | tsParticles | 2.x | MIT |
| `sql-wasm.js`, `sql-wasm.wasm` | sql.js | 1.x | MIT |

`leaflet.markercluster.css` is the upstream `MarkerCluster.css` and
`MarkerCluster.Default.css` concatenated, so the page makes one request instead
of two. The visual rules are overridden in `egybi.css` to use the Egyptian
palette; the upstream defaults are kept underneath so an override that is ever
removed degrades to a working cluster rather than an unstyled one.

None of these calls a network service at runtime. That is not an assumption:
`backend/verify/all-pages.js` fails the build on any off-origin request, and
`backend/verify/map-interaction.js` repeats the measurement while actually
panning, zooming and clicking the maps.
