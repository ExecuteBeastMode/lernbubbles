const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.join(__dirname,'..'),out=path.join(root,'app','house');
const result=require('./generate-house.cjs')(out);if(result.nodes!==218||result.actions!==21)throw new Error('Haus-Asset-Validierung fehlgeschlagen');
const binary=fs.readFileSync(path.join(out,'house.glb'));if(binary.toString('ascii',0,4)!=='glTF'||binary.readUInt32LE(8)!==binary.length)throw new Error('GLB-Header ungültig');
esbuild.buildSync({entryPoints:[path.join(root,'src','house','reference-entry.js')],bundle:true,outfile:path.join(out,'house.js'),format:'iife',platform:'browser',target:['chrome120'],minify:true,legalComments:'eof'});fs.copyFileSync(path.join(root,'src','house','index.html'),path.join(out,'index.html'));
console.log('Integriertes Haus-Grafikupdate gebaut; Browserprüfung separat.',result);
