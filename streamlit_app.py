"""Streamlit serves the game; the browser owns the live simulation."""
from pathlib import Path
import base64
import re
import streamlit as st

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title="Valrose Campus", page_icon="🏎️", layout="wide", initial_sidebar_state="collapsed")
st.markdown("<style>.block-container{padding-top:1rem;padding-bottom:0;max-width:none}header[data-testid='stHeader']{height:0}</style>", unsafe_allow_html=True)
left, right = st.columns([1, 10], vertical_alignment="center")
with left:
    logo = base64.b64encode((ROOT / "logo.png").read_bytes()).decode("ascii")
    st.markdown(f'<img src="data:image/png;base64,{logo}" width="76" alt="Valrose Campus">', unsafe_allow_html=True)
with right:
    st.markdown("### Valrose Campus")
    st.caption("Course ou découverte · Cliquez dans le jeu pour conduire · Flèches ou ZQSD · Espace pour freiner")

# Bundle local scripts into the frame so there are no asset server round trips.
# This app has no Python widgets: gameplay never triggers a Streamlit rerun.
@st.cache_data(show_spinner=False)
def game_html():
    folder = ROOT / "game"
    html = (folder / "index.html").read_text(encoding="utf-8")
    def inline(match):
        source = (folder / match.group(1)).read_text(encoding="utf-8")
        return "<script>" + source.replace("</script", "<\\/script") + "</script>"
    return re.sub(r'<script src="([^"]+)"></script>', inline, html)

st.iframe(game_html(), height=800, tab_index=0)
