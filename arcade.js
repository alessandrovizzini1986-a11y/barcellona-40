/* arcade.js — sistema condiviso: musica + suoni (on/off separati), classifiche con nome */
window.Arcade=(function(){
  var actx=null;
  function ctx(){ if(!actx){ try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } return actx; }
  function pref(k,d){ try{var v=localStorage.getItem(k); return v===null?d:v==='1';}catch(e){return d;} }
  function setp(k,v){ try{localStorage.setItem(k,v?'1':'0');}catch(e){} }
  var musicOn=pref('arc_music',true), sfxOn=pref('arc_sfx',true);

  function sfx(f,d,type){ if(!sfxOn)return; var a=ctx(); if(!a)return;
    var o=a.createOscillator(),g=a.createGain(); o.type=type||'square'; o.frequency.value=f;
    o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.16,a.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d); o.start(); o.stop(a.currentTime+d); }

  /* ---- musica chiptune in loop ---- */
  var mTimer=null, mStep=0;
  var MEL=[0,4,7,12, 7,4,0,4, 5,9,12,9, 7,4,2,0];
  var BASS=[0,0,5,5, 7,7,5,5];
  var BASE=174.6; // F3
  function tone(freq,dur,type,vol){ var a=ctx(); if(!a)return; var o=a.createOscillator(),g=a.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(a.destination); var t=a.currentTime;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.start(t); o.stop(t+dur); }
  function mtick(){ if(!musicOn)return;
    var s=MEL[mStep%MEL.length]; tone(BASE*Math.pow(2,s/12),.18,'square',.045);
    if(mStep%2===0){ var b=BASS[(mStep/2)%BASS.length]; tone(BASE/2*Math.pow(2,b/12),.34,'triangle',.06); }
    mStep++; }
  function musicStart(){ if(!musicOn)return; ctx(); if(mTimer)return; mStep=0; mTimer=setInterval(mtick,205); }
  function musicStop(){ if(mTimer){clearInterval(mTimer);mTimer=null;} }
  function toggleMusic(){ musicOn=!musicOn; setp('arc_music',musicOn); if(musicOn){ctx();musicStart();}else musicStop(); return musicOn; }
  function toggleSfx(){ sfxOn=!sfxOn; setp('arc_sfx',sfxOn); if(sfxOn)sfx(660,.05); return sfxOn; }

  /* ---- classifiche con nome (top 5 per gioco) ---- */
  function getScores(key){ try{return JSON.parse(localStorage.getItem('hs_'+key)||'[]');}catch(e){return [];} }
  function best(key){ var s=getScores(key); return s.length?s[0].s:0; }
  function bestName(key){ var s=getScores(key); return s.length?s[0].n:''; }
  function isHigh(key,score){ var s=getScores(key); return score>0 && (s.length<5 || score>s[s.length-1].s); }
  function addScore(key,name,score){ var s=getScores(key); s.push({n:(name||'???').slice(0,10),s:score});
    s.sort(function(a,b){return b.s-a.s;}); s=s.slice(0,5); try{localStorage.setItem('hs_'+key,JSON.stringify(s));}catch(e){} return s; }

  /* ---- overlay inserimento nome ---- */
  function nameEntry(score,cb){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;'+
      'background:rgba(4,4,10,.9);font-family:"Press Start 2P",monospace;text-align:center;padding:18px';
    ov.innerHTML='<div><div style="font-size:17px;color:#ffd28a;line-height:1.6">NUOVO<br>RECORD!</div>'+
      '<div style="font-size:9px;color:#cdd6ee;margin:14px 0 10px">punti '+score+'</div>'+
      '<input id="arcName" maxlength="10" placeholder="NOME" autocomplete="off" '+
      'style="width:210px;text-transform:uppercase;text-align:center;font-family:inherit;font-size:13px;padding:13px;'+
      'border-radius:9px;border:2px solid #ffd28a;background:#0c0c18;color:#fff;outline:none"><br>'+
      '<button id="arcOk" style="margin-top:16px;font-family:inherit;font-size:11px;color:#10100a;background:#ffd28a;'+
      'border:none;border-radius:9px;padding:13px 24px;cursor:pointer">SALVA ▶</button></div>';
    document.body.appendChild(ov);
    var inp=ov.querySelector('#arcName'); setTimeout(function(){try{inp.focus();}catch(e){}},60);
    function done(){ var n=(inp.value||'').trim().replace(/[<>]/g,'').toUpperCase()||'???'; ov.remove(); cb(n); }
    ov.querySelector('#arcOk').addEventListener('click',done);
    inp.addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter') done(); });
  }

  /* ---- aggancia due bottoni MUSICA / SUONI (per id) ---- */
  function bindAudioButtons(musicBtnId,sfxBtnId){
    var mb=document.getElementById(musicBtnId), sb=document.getElementById(sfxBtnId);
    function lab(){ if(mb){mb.textContent='MUSICA '+(musicOn?'ON':'OFF'); mb.classList.toggle('off',!musicOn);}
      if(sb){sb.textContent='SUONI '+(sfxOn?'ON':'OFF'); sb.classList.toggle('off',!sfxOn);} }
    if(mb) mb.addEventListener('click',function(){ ctx(); toggleMusic(); lab(); });
    if(sb) sb.addEventListener('click',function(){ ctx(); toggleSfx(); lab(); });
    lab();
  }

  return {ctx:ctx, sfx:sfx, musicStart:musicStart, musicStop:musicStop, toggleMusic:toggleMusic, toggleSfx:toggleSfx,
    isMusic:function(){return musicOn;}, isSfx:function(){return sfxOn;},
    getScores:getScores, best:best, bestName:bestName, isHigh:isHigh, addScore:addScore, nameEntry:nameEntry,
    bindAudioButtons:bindAudioButtons};
})();
