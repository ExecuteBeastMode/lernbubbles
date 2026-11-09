const {app}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
function install3D(url){
 const top=document.getElementById('top');if(!top||document.getElementById('lb-heizraum3d'))return;
 const button=document.createElement('button');button.id='lb-heizraum3d';button.textContent='3D-Heizraum';
 button.addEventListener('click',()=>{
  if(document.getElementById('lb-heizraum3d-overlay'))return;
  const focus=document.activeElement,overlay=document.createElement('section'),close=document.createElement('button'),frame=document.createElement('iframe');
  overlay.id='lb-heizraum3d-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','3D-Heizraum');
  overlay.style.cssText='position:fixed;inset:0;z-index:10001;background:#0c1725;display:flex;flex-direction:column';
  close.textContent='3D-Heizraum schließen';close.style.cssText='align-self:flex-start;margin:8px;padding:10px';
  frame.title='3D-Heizraum-Prototyp';frame.style.cssText='width:100%;flex:1;min-height:0;border:0';
  const state=[...document.body.children].map(node=>[node,node.inert]);state.forEach(([node])=>node.inert=true);
  function dismiss(){window.removeEventListener('message',receive);document.removeEventListener('keydown',escape,true);overlay.remove();state.forEach(([node,inert])=>{if(node.isConnected)node.inert=inert});if(focus&&focus.isConnected)focus.focus()}
  function receive(e){if(e.source===frame.contentWindow&&e.data&&e.data.type==='lb-heizraum3d-close')dismiss()}
  function escape(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();dismiss()}}
  close.addEventListener('click',dismiss);window.addEventListener('message',receive);document.addEventListener('keydown',escape,true);
  frame.src=url;overlay.append(close,frame);document.body.append(overlay);close.focus();
 });top.append(button);
}
app.on('browser-window-created',(_event,win)=>win.webContents.on('did-finish-load',()=>{
 const url=win.webContents.getURL();if(!url.startsWith('file:')||!url.split(/[?#]/)[0].endsWith('/index.html'))return;
 const scene=pathToFileURL(path.join(__dirname,'app','heizraum3d.html')).href;
 win.webContents.executeJavaScript('('+install3D.toString()+')('+JSON.stringify(scene)+')').catch(console.error);
}));
require('./offline-main.js');
