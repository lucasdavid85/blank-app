# 🏎️ Valrose Campus for Streamlit

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://blank-app-template.streamlit.app/)

Race your circuit or explore the campus by car. Visit mode includes eight discovery destinations and no programmed speed limiter. The game includes the campus buildings, labels, breakable entrance gate, lake with its island, fountains and sampled IGN terrain.

## Start

Install Python 3.10 or newer, then from the repo root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run streamlit_app.py
```

Open the local address printed by Streamlit. On macOS or Linux, use `.venv/bin/python` for the last two commands.

Click inside the game before driving. Use arrows or ZQSD, Space to brake, R to reset, C for camera and M for the map. Choose Course or Visite from the Mode menu. Use Save data pack to preserve edits before reloading.

## Performance

Python serves the page once. All driving, physics, collision checks and rendering run in JavaScript in the browser. Steering sends no requests to Python and cannot trigger Streamlit reruns. Scripts, Three.js and initial campus data are bundled locally. Optional data refresh buttons still require internet access.

Rapide is the default graphics preset, with shadows disabled and pixel ratio capped at 1. Équilibré and Détaillé increase rendering quality. Physics uses a fixed 120 Hz simulation step, with bounded catchup after stalls. The HUD refreshes at 10 Hz and the minimap at 15 Hz. The scene renders with requestAnimationFrame. Hidden tabs suspend simulation. Severe frame drops can slow simulation time because catchup is bounded.

Zero latency is not possible: frame rate, GPU load, display refresh and input devices still affect response. The FPS counter is an approximate rendering rate, not an input latency measurement. Use Rapide and close other demanding applications for the smoothest experience.

## Implementation and checks

Streamlit 1.63.0 is pinned. The app uses its public st.iframe API. Local scripts are inlined into a cached HTML frame; no additional game server, custom component protocol or CDN is needed. Restart Streamlit after editing game source files to clear the cached HTML.

The Python startup test passed with one game iframe and no app exceptions. Browser checks confirmed the campus loads, both modes are available, visit destinations work and graphics settings switch without console errors. The existing Node game checks passed for race and visit behavior, gate collision, campus geometry, lake island, terrain and editing round trips. A stationary browser observation showed about 60 FPS; this is not a moving gameplay benchmark.

Run the game checks with Node.js:

```powershell
node game/tools/check.cjs
```

The campus remains an approximation: mapped footprints and sampled terrain do not make the architecture survey accurate. See game/Guide.md and game/ATTRIBUTION.md for data sources and editing details.
