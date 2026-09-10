# Valrose Campus

Open index.html in the extracted folder, or open the separate ValroseCampus.html file. The game, map data and terrain are included for offline use.

## Two modes

Race uses the circuit supplied in your draft. Acceleration is boosted on the short launch to the entrance gate; break through it and follow the racing surface. The clock begins when you reach the circuit. R restores the kart and gate. Restore your circuit restores the original route after an edit.

Visit offers free driving without a programmed speed limit, including away from the circuit. Engine power and drag still affect acceleration. Choose a destination to see its introduction, direct distance and blue map marker. Approach it to record a discovery. The distance is a straight line, not route guidance. Buildings and water still block the car. The race timer and racing surface are hidden in this mode.

Drive with the arrow keys or WASD. Space applies the handbrake. C changes camera. M opens the map editor. Phones and tablets automatically display multi-touch controls; the settings panel starts collapsed to leave room for driving.

## Geographic corrections

The default terrain now contains 31,329 IGN RGE ALTI ground samples at five metre spacing across the 880 metre square scene. It is included in the export. At the Montebello residence marker, the interpolated terrain is 68.45 metres; the direct IGN sample is 68.43 metres. The previous fitted surface was 58.25 metres there. Ground data and interpolation do not recreate every retaining wall or staircase.

The main lake was absent because the original converter ignored its multipolygon relation. OpenStreetMap relation 1891267 supplies its shoreline and island. The model now includes that lake and five separate campus fountains. Eight neighbouring private pools have been removed. The approximate island shelter is placed on the mapped island. The previously invented bridge placement was removed pending a measured bridge alignment. Water levels remain estimated from shoreline terrain, not a hydrological survey.

## Names and annotations

Names appear on building signs and nearby overhead labels. Double click a building, or select Buildings in the map editor, to change its name and annotation. Apply dimensions confirms the fields. Export campus GeoJSON saves geometry, names and annotations, including the island. Save data pack also includes terrain. Save before closing: edits are not automatically stored.

Scroll to zoom the editor, drag with the right button to pan, drag a vertex to move it, use Shift and click to insert a vertex or Alt and click to remove one. Undo restores the previous edit.

The Campus reference option shows building letters from the university MapHub map. Green markers fall inside existing footprints; orange markers are reference points without matching footprints. Southern Q, R and S and western U still need additional footprint coverage. Buildings were not moved merely to force a marker match. Their letters differ between historical campus diagrams, so the attached perspective drawing is a visual reference rather than a coordinate source.

The château roof volumes, dormers, pinnacles, stairs, window bands and island shelter are simplified interpretations of your photographs. Their detailed dimensions are approximate.

## Sources

[CampusValrose map](https://maphub.net/CampusValrose/campus-valrose-2)

[IGN elevation service](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/)

[OpenStreetMap lake relation](https://www.openstreetmap.org/relation/1891267)

Map data: © OpenStreetMap contributors, ODbL. Elevation: IGN RGE ALTI, obtained 10 September 2026, Licence Ouverte. Retain ATTRIBUTION.md when sharing the project.

## Verification

Run node tools/check.cjs with Node to check gate collisions and driving from the start, restoring the original circuit, visitor speed behaviour, inactive race timing in visit mode, discovery triggers, terrain, geometry, lake island, annotations and export round trips. These are automated checks, not a browser visual review.

The earlier Python generator is retained as original source material. It recreates the old draft and can overwrite the geographic corrections. Do not run it on your only copy. Current authoritative geometry is data/valrose.geojson; current terrain is data/terrain-ign.json.
