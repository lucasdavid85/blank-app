# Data sources

## OpenStreetMap
The park polygon, all 149 building footprints and their names, the alley
network, and the ponds come from OpenStreetMap.

  (c) OpenStreetMap contributors, licensed under the Open Database License (ODbL).
  https://www.openstreetmap.org/copyright

ODbL is share-alike. If you publish this game, or any map derived from this
data, you must credit OpenStreetMap contributors visibly and make any improved
version of the *data* available under the same licence. The game code is yours;
the data carries the licence with it. A line in the UI or an about page is the
normal way to do this.

## IGN
The "Relief only (IGN)" button fetches RGE ALTI elevations from the French
Geoplateforme (https://data.geopf.fr), open licence (Licence Ouverte / Etalab).
Credit "IGN - RGE ALTI" if you ship data fetched this way.

## three.js
r128, MIT licence, vendored in vendor/three.min.js.

## Your own data
data/lap-waypoints.gpx is yours. The relief surface in src/02-relief.js is
fitted to its elevations.

Campus names, letters and location reference points: CampusValrose on MapHub, https://maphub.net/CampusValrose/campus-valrose-2. User supplied photographs inform approximate visual modelling.

## 360° visual reference
The Université Côte d'Azur virtual campus tour by VIP Studio 360 is linked from
the game and can be used as an external visual reference when refining the
campus model. No tour imagery is bundled with this project.
https://www.vip-studio360.fr/galerie360/visites/vv-universite-cote-dazur/vv-universite-cote-dazur-c.html?s=pano19

Terrain: IGN RGE ALTI, Licence Ouverte, retrieved 10 September 2026. Coordinates sampled at 5 metre spacing using the IGN elevation service.

## Laboratory and architectural references
Laboratory identities are checked against the Université Côte d'Azur 2025 campus plan. CCMA occupies space below the university library, confirmed by the CCMA access charter. The 2024 plan locates the former InPhyNi site; the current university institute page places InPhyNi at Nice Méridia. ICN's approximate 27-metre roof level and façade appearance follow the university's building E elevation drawing published with its renovation article. Reference images and plans are not bundled as game assets.

[Université Côte d'Azur campus plan, 2025](https://univ-cotedazur.fr/medias/fichier/plan-campus-valrose-2025-a4_1752832057222-pdf?ID_FICHE=1104022&INLINE=FALSE)

[Université Côte d'Azur building E elevation and façade renovation](https://univ-cotedazur.fr/universite/nous-connaitre/plan-de-relance/les-projets-architecturaux-des-batiments-chimie-sciences-naturelles-et-nouveau-batiment-s)

[CCMA access charter: below the university library](https://www.unice.fr/CCMA/CHARTE.pdf)

[Université Côte d'Azur campus plan, 2024: former InPhyNi site](https://univ-cotedazur.fr/medias/fichier/plan-du-campus-2024-web-red_1717054937888-pdf?ID_FICHE=8567&INLINE=FALSE)

[Current InPhyNi institute address](https://univ-cotedazur.fr/laboratoires/institut-de-physique-de-nice-inphyni)
