'use strict';
const {app}=require('electron');
const path=require('path');
const {pathToFileURL}=require('url');
function installMeasurementButton(simulatorURL){
 if(document.getElementById('lb-offline-messung'))return;
 const top=document.getElementById('top');
 if(!top)return;
 const button=document.createElement('button');
 button.id='lb-offline-messung';
 button.textContent='Messpraxis (offline)';
 button.title='Mitgelieferte Messsimulation ohne Internet öffnen';
 button.addEventListener('click',()=>{
  if(document.getElementById('lb-measurement-overlay'))return;
  const focused=document.activeElement;
  const overlay=document.createElement('section');
  overlay.id='lb-measurement-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Offline-Messpraxis');
  overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#0c1626;display:flex;flex-direction:column';
  const close=document.createElement('button');
  close.textContent='Messpraxis schließen / Zurück zum Lernbaum';
  close.style.cssText='margin:8px;align-self:flex-start;padding:10px';
  const frame=document.createElement('iframe');
  frame.title='Offline-Messsimulation';
  frame.style.cssText='width:100%;flex:1;min-height:0;border:0;background:#0c1626';
  frame.src=simulatorURL;
  function dismiss(){overlay.remove();document.removeEventListener('keydown',escape);if(focused&&focused.isConnected)focused.focus()}
  function escape(event){if(event.key==='Escape'){event.stopImmediatePropagation();dismiss()}}
  close.addEventListener('click',dismiss);
  document.addEventListener('keydown',escape,true);
  frame.addEventListener('load',()=>{
   try{
    const doc=frame.contentDocument;
    const back=doc&&doc.querySelector('header a');
    if(back)back.addEventListener('click',event=>{event.preventDefault();dismiss()});
    if(doc)doc.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss()}});
   }catch(error){console.warn('Messpraxis navigation:',error.message)}
  });
  overlay.append(close,frame);
  document.body.append(overlay);
  close.focus();
 });
 top.append(button);
}
app.on('browser-window-created',(_event,window)=>{
 window.webContents.on('did-finish-load',()=>{
  const url=window.webContents.getURL();
  if(!url.startsWith('file:')||!url.split(/[?#]/)[0].endsWith('/index.html'))return;
  const simulatorURL=pathToFileURL(path.join(__dirname,'app','messung.html')).href;
  window.webContents.executeJavaScript('('+installMeasurementButton.toString()+')('+JSON.stringify(simulatorURL)+')').catch(error=>console.error('Offline-Messpraxis:',error));
 });
});
require('./main.js');
