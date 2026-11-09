const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const root=path.join(__dirname,'..');
esbuild.buildSync({entryPoints:[path.join(root,'src','heizraum3d','main.js')],bundle:true,outfile:path.join(root,'app','heizraum3d.js'),format:'iife',platform:'browser',target:['chrome120'],minify:true,legalComments:'eof'});
if(!fs.statSync(path.join(root,'app','heizraum3d.js')).size)throw new Error('3D-Bundle fehlt');
