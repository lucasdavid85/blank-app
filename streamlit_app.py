"""Streamlit serves the game; the browser owns the live simulation."""
from pathlib import Path
import base64
import re
import streamlit as st

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title="Valrose Campus", page_icon="🏎️", layout="wide", initial_sidebar_state="collapsed")
logo = base64.b64encode((ROOT / "logo.png").read_bytes()).decode("ascii")
st.markdown(
    f"""
    <style>
      .block-container{{padding-top:.75rem;padding-bottom:0;max-width:none}}
      header[data-testid="stHeader"]{{height:0}}
      .app-intro{{display:flex;align-items:center;gap:1rem;margin:0 0 .6rem}}
      .app-intro img{{width:68px;height:auto;flex:none}}
      .app-intro h1{{font-size:1.45rem;line-height:1.15;margin:0 0 .2rem}}
      .app-intro p{{color:var(--text-color);font-size:.9rem;opacity:.7;margin:0}}
      @media (max-width:768px), (any-pointer:coarse){{
        .block-container{{padding:0!important}}
        .app-intro{{display:none}}
        iframe.stIFrame{{display:block;height:100dvh!important;min-height:100svh}}
      }}
    </style>
    <div class="app-intro">
      <img src="data:image/png;base64,{logo}" alt="Valrose Campus">
      <div>
        <h1>Valrose Campus</h1>
        <p>Race or explore · Click the game to drive · Arrow keys or WASD · Space for the handbrake</p>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Bundle local scripts into the frame so there are no asset server round trips.
# Do not cache this function: Streamlit does not track the JS/CSS files read
# inside it, so a hot deployment could otherwise keep serving an old game.
# The app has no Python widgets, therefore this work only happens on page load.
def game_html():
    folder = ROOT / "game"
    html = (folder / "index.html").read_text(encoding="utf-8")
    def inline(match):
        source = (folder / match.group(1)).read_text(encoding="utf-8")
        return "<script>" + source.replace("</script", "<\\/script") + "</script>"
    return re.sub(r'<script src="([^"]+)"></script>', inline, html)

st.iframe(game_html(), height=800, tab_index=0)
