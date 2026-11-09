async function captureScene(page,file){
 const started=Date.now();let paused=false,image,error;
 try{paused=await page.evaluate(()=>{const api=window.__referenceTest;return typeof api?.pauseCapture==='function'?api.pauseCapture():false});if(paused)await page.waitForTimeout(150);image=await page.screenshot({path:file,timeout:60000,animations:'disabled'})}catch(e){error=e}
 if(paused)try{await page.evaluate(()=>window.__referenceTest.resumeCapture())}catch(e){error=error||e}
 console.log(JSON.stringify({capture:file,milliseconds:Date.now()-started,renderPaused:paused,passed:!error}));
 if(error)throw error;return image;
}
module.exports={captureScene};
