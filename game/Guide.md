# Valrose Campus

Open index.html in the extracted folder, or open the separate ValroseCampus.html file. The game, map data and terrain are included for offline use.

## Two modes

Race uses the circuit supplied in your draft. Select Start race or press Enter for a 3–2–1–GO countdown. The kart waits for GO, and the countdown pauses in hidden tabs or map mode. Visit starts immediately. Acceleration is boosted on the short launch to the entrance gate; break through it and follow the racing surface. Slim, half-metre-high metal rails keep the kart on the racing surface by blocking outward movement. They do not correct its heading or add motion along the track; hitting them can slow you down, and turning is entirely up to you. Race restores the original 72 km/h speed cap and slope effect. The green center line and forward chevrons mark the boost: accelerating forward within 0.7 metres of the line gives 1.85× engine acceleration and charges the meter. Stay on the line for two seconds while moving to earn a 2.5-second burst capped at 100.8 km/h. An earned burst remains active when you steer off the line, so plan where to use it. Leaving before the meter fills drains unearned charge. Braking, handbraking, releasing acceleration, heading against the circuit or a collision cancels the boost. Burst expiry restores the base cap. Steering input ramps smoothly, and the camera follows your heading and steering intent. It never turns the kart toward the circuit. The HUD shows lap progress and distance to finish; wheel animation, boost flames, painted kerbs and rail sparks add racing feedback. The finish screen records boosts and rail contacts alongside your time. The clock begins when you reach the circuit and measures elapsed time, excluding hidden tabs and map editing. Completing a tour opens “You finished it in …” with your time in seconds or minutes and a scoreboard of the five fastest laps in this page session. Race again starts another tour; Explore campus switches to visit mode. Reloading clears scores, and changing the circuit clears the old course's scores. R restores the kart and gate. Restore your circuit restores the original route after an edit.

Visit offers free driving without a programmed speed limit, including away from the circuit. Engine power and drag still affect acceleration. Settings and destination panels are hidden so the view remains clear on phones. Building signs and the minimap remain available. The small Race/Visit switch lets you return to racing. Buildings and water still block the car. The race timer and racing surface are hidden in this mode.

Drive with the arrow keys or WASD. Space applies the handbrake. C changes camera. M opens the map editor. Phones and tablets automatically display a circular four-arrow pad inspired by the supplied reference: up accelerates, down brakes or reverses, and left/right steer. Keep your thumb down and slide between the arrows. Diagonal positions combine acceleration or reverse with steering. The center is neutral; sliding outside the pad releases the drive keys and sliding back in resumes input. The right-hand buttons apply the handbrake, reset the kart or change the camera. Touch release, cancellation, screen rotation and reset clear held inputs. In race mode, the settings panel starts as a compact + button.

## Ideal lap timing

The supplied circuit center line is 1,246.93 metres long. At a constant 72 km/h, following its entire center line takes 62.35 seconds; at the 100.8 km/h boost cap throughout, it takes 44.53 seconds. These are ideal distance/speed benchmarks, excluding acceleration, corner braking, slopes and goose or rail contact. Timed boosts include a charging interval, so the boost cap cannot be maintained throughout a normal lap. They are not a measured best lap or a proven minimum over all possible racing lines. The check script reports these values from the current circuit and physics.

## Your race picture

Finish a lap and enter your name on the result screen. The scoreboard and postcard update with that name. The picture combines the campus view, your name, lap time and session best. Share picture opens your device's share menu when supported, with a PNG download fallback. Download picture saves the PNG directly so you can send it to friends. Cancelling the share menu leaves the picture available. Names and scores are kept only for the current page session; sharing is triggered by your button press.

## Geese

Five stylized white geese patrol the circuit edges in both modes. An amber ground ring and a Honk warning signal an incoming attack while their wings flap. Their charge direction is fixed during the warning, so you can steer or brake to avoid their path. Contact causes a brief slowdown, followed by immunity against repeated bumps from the same attack. Geese retreat to their starting positions and reset with the kart.

## Geographic corrections

The default terrain now contains 31,329 IGN RGE ALTI ground samples at five metre spacing across the 880 metre square scene. It is included in the export. At the Montebello residence marker, the interpolated terrain is 68.45 metres; the direct IGN sample is 68.43 metres. The previous fitted surface was 58.25 metres there. Ground data and interpolation do not recreate every retaining wall or staircase. The surface now has a repeating grass texture and upward-facing triangles, fixing hills disappearing from above. Cameras remain above the terrain after smoothing, with extra clearance over intervening ridges in chase views. The gate sign faces the starting kart and has a separate readable campus-facing side.

The main lake was absent because the original converter ignored its multipolygon relation. OpenStreetMap relation 1891267 supplies its shoreline and island. The model now includes that lake and five separate campus fountains. Eight neighbouring private pools have been removed. The approximate island shelter is placed on the mapped island. The previously invented bridge placement was removed pending a measured bridge alignment. Water levels remain estimated from shoreline terrain, not a hydrological survey.

## Names and annotations

Names appear on building signs and nearby overhead labels. Double click a building, or select Buildings in the map editor, to change its name and annotation. Apply dimensions confirms the fields. Export campus GeoJSON saves geometry, names and annotations, including the island. Save data pack also includes terrain. Save before closing: edits are not automatically stored.

The settings panel includes an external **Open the 360° campus tour** button. It opens the Université Côte d'Azur virtual visit in a new browser tab so you can compare paths, façades, vegetation and landmarks while refining the campus model.

Scroll to zoom the editor, drag with the right button to pan, drag a vertex to move it, use Shift and click to insert a vertex or Alt and click to remove one. Undo restores the previous edit.

The Campus reference option shows building letters from the university MapHub map. Green markers fall inside existing footprints; orange markers are reference points without matching footprints. Southern Q, R and S and western U still need additional footprint coverage. Buildings were not moved merely to force a marker match. Their letters differ between historical campus diagrams, so the attached perspective drawing is a visual reference rather than a coordinate source.

The château roof volumes, dormers, pinnacles, stairs, window bands and island shelter are simplified interpretations of your photographs. Their detailed dimensions are approximate.

## Sources

[CampusValrose map](https://maphub.net/CampusValrose/campus-valrose-2)

[Université Côte d'Azur 360° campus tour](https://www.vip-studio360.fr/galerie360/visites/vv-universite-cote-dazur/vv-universite-cote-dazur-c.html?s=pano19&h=0&v=-10.2594&f=90.0000&skipintro&norotation)

[IGN elevation service](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-altimetrique/)

[OpenStreetMap lake relation](https://www.openstreetmap.org/relation/1891267)

Map data: © OpenStreetMap contributors, ODbL. Elevation: IGN RGE ALTI, obtained 10 September 2026, Licence Ouverte. Retain ATTRIBUTION.md when sharing the project.

## Verification

Run node tools/check.cjs with Node to check gate collisions and driving from the start, restoring the original circuit, visitor speed behaviour, inactive race timing in visit mode, discovery triggers, terrain, geometry, lake island, annotations and export round trips. These are automated checks, not a browser visual review.

The earlier Python generator is retained as original source material. It recreates the old draft and can overwrite the geographic corrections. Do not run it on your only copy. Current authoritative geometry is data/valrose.geojson; current terrain is data/terrain-ign.json.
