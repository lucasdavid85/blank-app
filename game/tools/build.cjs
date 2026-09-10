const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
require('./check.cjs');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','src','vendor','streamlit-bridge.js'])fs.cpSync(path.join(root,name),path.join(root,'dist',name),{recursive:true});
console.log('Static build ready');

