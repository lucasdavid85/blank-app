const QUALITY_PRESETS={fast:{ratio:1,shadows:false},balanced:{ratio:1.5,shadows:true},detailed:{ratio:2,shadows:true}};
let qualityMode='fast';
function applyQuality(mode){
 qualityMode=QUALITY_PRESETS[mode]?mode:'fast';const q=QUALITY_PRESETS[qualityMode];
 renderer.setPixelRatio(Math.min(q.ratio,devicePixelRatio||1));renderer.shadowMap.enabled=q.shadows;
 scene.traverse(o=>{if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const mat of mats)mat.needsUpdate=true;}});
 onResize();
}
