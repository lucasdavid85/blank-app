# 🏎️ Valrose Campus for Streamlit

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://blank-app-template.streamlit.app/)

Race your circuit or explore the campus by car. Race mode has red-and-white guardrails, a finish-time scoreboard and animated geese to dodge. Visit mode offers free driving with no settings or destination panels and no programmed speed limiter. The game includes the campus buildings, labels, breakable entrance gate, lake with its island, fountains and sampled IGN terrain.

## Start

Install Python 3.10 or newer, then from the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run streamlit_app.py
```

Open the local address printed by Streamlit. On macOS or Linux, use `.venv/bin/python` for the last two commands.

Click inside the game before driving. Use arrow keys or WASD, Space for the handbrake, R to reset, C for the camera, and M for the map. Use the small Race/Visit buttons to switch modes. Phones and tablets automatically use a full-height game view with a circular four-arrow pad: up accelerates, down brakes or reverses, and left/right steer. Hold up and a steering arrow together to turn while driving. Handbrake, reset and camera buttons sit on the right. Race settings open from the compact + button, which also links to an external 360° campus tour. Visit mode hides both the settings and discovery panels. Use Save data pack to preserve edits before reloading.

## Performance

Python serves the page once. All driving, physics, collision checks and rendering run in JavaScript in the browser. Steering sends no requests to Python and cannot trigger Streamlit reruns. Scripts, Three.js and initial campus data are bundled locally. Optional data refresh buttons still require internet access.

Fast is the default graphics preset, with shadows disabled and pixel ratio capped at 1. Balanced and Detailed increase rendering quality. Physics uses a fixed 120 Hz simulation step, with bounded catchup after stalls. The race clock measures elapsed wall time, pauses in hidden tabs or the map, and stops when a tour finishes. The scoreboard shows the five fastest laps in the current page session; reloading clears scores, and editing the circuit starts a new scoreboard. Guardrail contact redirects motion along the track without an off-road speed penalty. Geese flash a warning ring and flap their wings before charging in a fixed direction. Steering away during the warning avoids them; a hit briefly slows the kart. The HUD refreshes at 10 Hz and the minimap at 15 Hz. The scene renders with requestAnimationFrame. Hidden tabs suspend simulation. Severe frame drops can slow simulation time because catchup is bounded.

Zero latency is not possible: frame rate, GPU load, display refresh and input devices still affect response. The FPS counter is an approximate rendering rate, not an input latency measurement. Use Fast and close other demanding applications for the smoothest experience.

## Implementation and checks

Streamlit 1.63.0 is pinned. The app uses its public st.iframe API. Local scripts are inlined into a fresh HTML frame when the page loads, so deployed JavaScript and CSS changes cannot be hidden by a stale Streamlit data cache. No additional game server, custom component protocol or CDN is needed.

The Python startup test passed with no app exceptions. Node checks cover race and visit behavior, barrier placement and speed preservation, elapsed timing, finish and replay, reverse crossing, touch cancellation and reset, goose warning/dodging/contact, gate collision, campus geometry, lake island, terrain and editing round trips. The supplied circuit was also sampled over a full tour to verify its lap progress. The latest phone layout has not been visually checked in a browser; no browser was connected during these changes.

Run the game checks with Node.js:

```powershell
node game/tools/check.cjs
```

The campus remains an approximation: mapped footprints and sampled terrain do not make the architecture survey accurate. See game/Guide.md and game/ATTRIBUTION.md for data sources and editing details.
