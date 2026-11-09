const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const esbuild=require('esbuild');
const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lb3d-test-'));
try{
 const test=path.join(tmp,'test.cjs');
 esbuild.buildSync({entryPoints:[path.join(root,'tests','heizraum3d.test.js')],bundle:true,outfile:test,platform:'node',format:'cjs',target:['node20'],legalComments:'none'});
 execFileSync(process.execPath,[test],{stdio:'inherit'});
 esbuild.buildSync({entryPoints:[path.join(root,'src','heizraum3d','main.js')],bundle:true,outfile:path.join(root,'app','heizraum3d.js'),format:'iife',platform:'browser',target:['chrome120'],minify:true,legalComments:'eof'});
 if(!fs.statSync(path.join(root,'app','heizraum3d.js')).size)throw new Error('3D-Bundle fehlt');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
