# 🏎️ Valrose Campus for Streamlit

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://blank-app-template.streamlit.app/)

Race your circuit or explore the campus by car. Race mode has a countdown start, slim low rails, a green center line that charges timed boosts, a finish-time scoreboard and animated geese to dodge. Its racing flow takes inspiration from [The Race](https://race.brayo.co/), adapted to the Valrose campus. Race has the original 72 km/h speed limit, with up to 100.8 km/h on the center boost. Steering through corners is entirely manual. Visit mode offers free driving with no settings or destination panels and no programmed speed limiter. The game includes the campus buildings, labels, breakable entrance gate, lake with its island, fountains and sampled IGN terrain.

## Start

Install Python 3.10 or newer, then from the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run streamlit_app.py
```

Open the local address printed by Streamlit. On macOS or Linux, use `.venv/bin/python` for the last two commands.

Click Start race (or press Enter) and wait for 3–2–1–GO. The kart waits during the countdown; the lap clock starts when you reach the circuit, excluding the countdown and entrance launch. Visit starts immediately. Use arrow keys or WASD, Space for the handbrake, R to reset, C for the camera, and M for the map. Use the small Race/Visit buttons to switch modes. Phones and tablets automatically use a full-height game view with a circular four-arrow pad: up accelerates, down brakes or reverses, and left/right steer. Slide your thumb between arrows without lifting it. Diagonal positions accelerate (or reverse) and steer together. The center of the pad is neutral, and sliding outside releases input. Handbrake, reset and camera buttons sit on the right. Race settings open from the compact + button, which also links to an external 360° campus tour. Visit mode hides both the settings and discovery panels. Use Save data pack to preserve edits before reloading.

After finishing a lap, enter your name on the finish screen to update the scoreboard and race postcard. The PNG includes a campus picture, your name, lap time and session best. Share picture opens the device share menu when file sharing is supported. Otherwise it downloads the PNG so you can attach it to a message; Download picture is also available directly. PNGs are prepared before the share click so native sharing keeps the browser's user activation. Native sharing needs a supported browser and a secure context; downloads provide a fallback in restricted iframe contexts. Nothing is sent automatically. Names and scores last for the current page session.

## Performance

Python serves the page once. All driving, physics, collision checks and rendering run in JavaScript in the browser. Steering sends no requests to Python and cannot trigger Streamlit reruns. Scripts, Three.js and initial campus data are bundled locally. Optional data refresh buttons still require internet access.

Fast is the default graphics preset, with shadows disabled and pixel ratio capped at 1. Balanced and Detailed increase rendering quality. Physics uses a fixed 120 Hz simulation step, with bounded catchup after stalls. The race clock measures elapsed wall time, pauses in hidden tabs or the map, and stops when a tour finishes. The scoreboard shows the five fastest laps in the current page session; reloading clears scores, and editing the circuit starts a new scoreboard. The low metal rails block outward motion without turning the kart or adding speed along the track. Drivers must steer through bends themselves; striking a rail loses the outward part of their velocity. Race has the original 72 km/h speed cap and stronger slope effect. Driving forward on the green center line while accelerating gives 1.85× engine acceleration and charges the boost. Holding the line for two seconds while moving earns a 2.5-second burst capped at 100.8 km/h. An earned burst carries off the line; braking, handbraking, releasing acceleration, heading against the circuit or a collision cancels it. Leaving before the charge completes drains the meter. When a burst ends, the 72 km/h cap returns. The HUD shows lap progress, remaining distance and charge or boost time. Race steering input ramps smoothly without any circuit-based heading correction. The chase camera follows heading and steering intent, pulls back during boost and smoothly changes its field of view. Painted kerbs, a chequered finish stripe, rotating and steering wheels, boost flames and rail sparks give visual feedback. The finish screen also shows earned boosts and rail contacts. Visit remains uncapped. Grass uses a repeating local texture over the actual IGN elevation surface. Upward-facing ground triangles keep hills visible from above, and all camera modes stay above the ground; chase views also clear intervening terrain. The entrance sign has separate readable faces toward the race start and campus. Geese flash a warning ring and flap their wings before charging in a fixed direction. Steering away during the warning avoids them; a hit briefly slows the kart. The HUD refreshes at 10 Hz and the minimap at 15 Hz. The scene renders with requestAnimationFrame. Hidden tabs suspend simulation. Severe frame drops can slow simulation time because catchup is bounded.

Zero latency is not possible: frame rate, GPU load, display refresh and input devices still affect response. The FPS counter is an approximate rendering rate, not an input latency measurement. Use Fast and close other demanding applications for the smoothest experience.

## Implementation and checks

Streamlit 1.63.0 is pinned. The app uses its public st.iframe API. Local scripts are inlined into a fresh HTML frame when the page loads, so deployed JavaScript and CSS changes cannot be hidden by a stale Streamlit data cache. No additional game server, custom component protocol or CDN is needed.

The Python startup test passed with no app exceptions. Node checks cover continuous sliding and diagonals, multi-touch cancellation and reset, restored race speed and uncapped visit motion, center-line charge timing and capped burst conditions, burst cancellation and expiry, stationary charge prevention, ready/countdown/GO transitions and hidden/map pauses, progress HUD and pooled spark/wheel/flame state, rail geometry and manual steering, elapsed timing, finish and replay, safe name display, named PNG export, native-share timing and download/cancellation fallbacks, stale image callbacks, goose attacks, gate collisions, campus geometry, lake island, upward terrain faces, grass mapping, gate sign orientation, camera clearance and editing round trips. The supplied circuit was sampled over a full tour to verify its lap progress. A driving simulation also completed the entire original circuit using only throttle, braking and steering keys, with terrain, buildings, water and geese active and no rail contacts. This validates completion, not an optimal lap time. The latest phone layout has not been visually checked in a browser; no browser was connected during these changes.

Run the game checks with Node.js:

```powershell
node game/tools/check.cjs
```

The campus remains an approximation: mapped footprints and sampled terrain do not make the architecture survey accurate. See game/Guide.md and game/ATTRIBUTION.md for data sources and editing details.
