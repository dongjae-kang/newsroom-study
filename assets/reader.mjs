import {parseText,alignText,validateReader,timeLabel} from './reader-core.mjs';
import {readEpisode,writeEpisode} from './reader-store.mjs';
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeRecord=null;
let activeEpisode=null;
let activeSaved=true;
export async function renderReader(host,course,id,notify){
  const e=course.episodes.find(x=>x.id===id)||course.episodes[0];
  const route=location.hash;
  host.innerHTML='<p class="loading">개인 읽기 자료를 확인하고 있습니다.</p>';
  let record=activeEpisode===e.id?activeRecord:null,storageAvailable=activeSaved;
  try {if(!record){const stored=await readEpisode(e.id);if(stored)record=validateReader(stored,e.id);}}catch{storageAvailable=false;}
  if(location.hash!==route)return;
  activeEpisode=e.id;activeRecord=record;
  const options=course.episodes.map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>S${x.season}E${x.number} · ${esc(x.title)}</option>`).join('');
  const header=`<section class="reading-header"><div><span class="eyebrow">THE CONTINUOUS READER</span><h1>처음부터 끝까지,<br>흐름을 따라 읽기.</h1><p>영어와 한글을 함께 읽고, 필요한 대목에서만 멈춰 보세요.</p></div><label class="episode-select">읽을 에피소드<select id="reader-episode">${options}</select></label></section><div class="reading-title"><div><span class="eyebrow">${e.id}</span><h2>${esc(e.title)}</h2></div><a class="text-link" href="#lesson/${e.id}/briefing">배경과 학습 노트 ↗</a></div>`;
  const setup=`<details class="reader-setup" ${record?'':'open'}><summary>${record?'자료 바꾸기 · 한글 번역 추가':'내 자막·대본 열기'}</summary><p class="reader-help">영어 SRT·VTT·TXT 또는 영어와 한글이 함께 든 JSON을 넣어 주세요. 한글 자막은 선택 사항입니다. 자료는 이 브라우저에서 처리하고 저장하며, GitHub에 올리지 않습니다.</p><div class="reader-inputs"><label>영어 원문 또는 병렬 JSON<input id="reader-en-file" type="file" accept=".srt,.vtt,.txt,.json"><textarea id="reader-en-text" placeholder="영어 자막이나 대본을 여기에 붙여넣을 수도 있습니다." spellcheck="false"></textarea></label><label>한글 번역 또는 한글 자막 (선택)<input id="reader-ko-file" type="file" accept=".srt,.vtt,.txt"><textarea id="reader-ko-text" placeholder="한글 자료가 있으면 함께 넣어 주세요. 영어만으로 자동 번역되지는 않습니다." spellcheck="false"></textarea></label></div><div class="reader-import-controls"><label>한글 시간 보정 (초)<input id="reader-offset" type="number" min="-3600" max="3600" step="0.1" value="0"></label><button class="button" id="reader-load">${record?'선택한 자료 적용':'연속 읽기 시작'} →</button></div><p class="reader-help">시간이 있는 자막은 겹치는 시간으로 임시 연결합니다. 시간이 없는 텍스트는 한 줄씩 대응하며 영어와 한글의 줄 수가 같아야 합니다. 새 원문은 현재 자료와 읽던 위치를 교체합니다.</p></details>`;
  const notes=`<aside class="reading-notes"><span class="eyebrow">READING COMPANION</span><h3>필요할 때 펼치는 해설</h3>${e.prepared?`<details><summary>배경 브리핑 ${e.briefing.length}개</summary>${e.briefing.map(b=>`<h4>${esc(b.title)}</h4><p>${esc(b.text)}</p>`).join('')}<a class="text-link" href="#lesson/${e.id}/briefing">근거 출처까지 보기 →</a></details><details><summary>준비된 구문 해설 ${e.units.length}개</summary>${e.units.map((u,i)=>`<p><a href="#lesson/${e.id}/scene/${i}" target="_blank" rel="noopener">${esc(u.title)} ↗</a></p>`).join('')}<p>전체 대사의 해설이 완성된 상태는 아닙니다.</p></details>`:'<p>이 에피소드의 배경·표현 해설은 아직 준비 중입니다.</p>'}<details><summary>읽기와 말하기를 나누기</summary><p>처음에는 번역과 함께 내용을 끝까지 따라갑니다. 다시 읽을 때 한글을 가리고 이해를 확인합니다. 마지막으로 필요한 표현만 골라 자신의 문장으로 바꿔 봅니다.</p></details></aside>`;
  host.innerHTML=header+setup+`<p class="reader-warning" id="reader-save-warning" ${storageAvailable?'hidden':''}>브라우저 저장을 사용할 수 없습니다. 이 페이지를 떠나기 전에 읽기 자료를 내보내 주세요.</p>`+(record?`<div class="reading-toolbar"><label><input id="reader-show-ko" type="checkbox" checked> 한글 함께 보기</label><label class="reader-search"><span class="visually-hidden">원문과 번역 검색</span><input id="reader-search" type="search" placeholder="원문·번역에서 찾기"></label><button id="reader-resume" class="button small secondary">읽던 위치로</button><button id="reader-export" class="button small secondary">개인 자료 내보내기 ↓</button></div><p id="reader-meta" class="reader-help"></p><div class="reading-layout"><section aria-label="영한 연속 읽기"><div class="reading-column-head"><span>ENGLISH</span><span>KOREAN</span></div><div id="reading-lines"></div><div id="unmatched-translations"></div></section>${notes}</div>`:`<div class="reading-layout"><section class="reader-empty"><span class="eyebrow">PERSONAL READING COPY</span><h2>아직 이 에피소드의 전체 원문이 없습니다.</h2><p>현재 공개된 자료는 출처 목록과 일부 학습 노트입니다. 영어 원문과 한글 번역 전문이 확보된 상태는 아닙니다.</p><p>직접 제공한 자막·대본을 불러오면 전체 내용을 이곳에서 연속해서 읽을 수 있습니다. 번역이 없는 줄은 “번역 없음”으로 구분합니다.</p><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="button secondary">영어 원문 출처 열기 ↗</a></section>${notes}</div>`);
  document.querySelector('#reader-episode').addEventListener('change',event=>location.hash=`reader/${event.target.value}`);
  document.querySelector('#reader-load').addEventListener('click',importSelected);
  if(record)drawLines();
  async function persist(){
    try {await writeEpisode(record);activeSaved=true;const warning=document.querySelector('#reader-save-warning');if(warning)warning.hidden=true;return true;}
    catch {activeSaved=false;const warning=document.querySelector('#reader-save-warning');if(warning)warning.hidden=false;return false;}
  }
  async function readInput(fileId,textId){
    const text=document.querySelector(textId).value.trim();
    const file=document.querySelector(fileId).files?.[0];
    if(text&&file)throw Error('같은 언어에는 파일과 붙여넣기 중 하나만 사용해 주세요.');
    if(file){if(file.size>3_000_000)throw Error('한 에피소드씩 3MB 이하의 파일을 사용해 주세요.');return {text:await file.text(),name:file.name};}
    return {text,name:text?'붙여넣은 자료':''};
  }
  async function importSelected(){
    const btn=document.querySelector('#reader-load');
    try {
      btn.disabled=true;
      const en=await readInput('#reader-en-file','#reader-en-text'),ko=await readInput('#reader-ko-file','#reader-ko-text');
      if(!en.text&&!ko.text)throw Error('영어 원문 또는 추가할 한글 자료를 먼저 넣어 주세요.');
      let next;
      if(en.text.trim().startsWith('{')) {
        if(ko.text)throw Error('병렬 JSON에는 번역이 포함됩니다. 한글 입력란을 비운 뒤 적용해 주세요.');
        next=validateReader(JSON.parse(en.text),e.id);
      } else {
        const english=en.text?parseText(en.text):record?.cues.map(c=>({start:c.start,end:c.end,text:c.english}));
        if(!english?.length)throw Error('영어 원문을 먼저 넣어 주세요.');
        const paired=alignText(english,ko.text?parseText(ko.text):[],Number(document.querySelector('#reader-offset').value));
        if(!en.text&&record)paired.cues.forEach((c,i)=>{c.note=record.cues[i].note;c.literal=record.cues[i].literal;});
        next=validateReader({app:'newsroom-reader',version:1,episode:e.id,...paired,bookmark:en.text?0:record.bookmark,englishName:en.name||record?.englishName||'',koreanName:ko.name},e.id);
      }
      if(record&&en.text&&!confirm('현재 원문과 읽던 위치를 새 자료로 교체할까요? 필요한 경우 먼저 개인 자료를 내보내세요.'))return;
      record=next;activeRecord=record;
      const stored=await persist();
      if(location.hash!==route)return;
      await renderReader(host,course,e.id,notify);
      notify(stored?'자료를 이 브라우저에 저장했습니다. 전체 내용을 이어서 읽을 수 있습니다.':'자료를 열었습니다. 저장은 되지 않았으므로 내보내기로 보관해 주세요.');
    }catch(error){notify(error instanceof SyntaxError?'JSON 형식을 확인해 주세요.':error.message);}finally{if(btn.isConnected)btn.disabled=false;}
  }
  function drawLines(){
    const list=document.querySelector('#reading-lines'),search=document.querySelector('#reader-search'),toggle=document.querySelector('#reader-show-ko');
    const translated=record.cues.filter(c=>c.korean.trim()).length;
    document.querySelector('#reader-meta').textContent=`전체 ${record.cues.length}개 항목 · 한글 있음 ${translated}개 · 한글 없음 ${record.cues.length-translated}개. ${record.alignment==='time_overlap'?'번역은 시간 겹침으로 연결한 결과이므로 실제 의미가 맞는지 확인하세요.':record.alignment==='line_order'?'시간 없는 자료를 줄 순서대로 연결했습니다.':'제공한 자료의 내용을 표시합니다.'}`;
    function renderRows(){
      const query=search.value.toLocaleLowerCase().trim();
      const matched=record.cues.map((c,i)=>({c,i})).filter(({c})=>!query||`${c.english} ${c.korean}`.toLocaleLowerCase().includes(query));
      list.classList.toggle('english-only',!toggle.checked);
      document.querySelector('.reading-column-head').classList.toggle('english-only',!toggle.checked);
      list.innerHTML=matched.map(({c,i})=>`<article class="reading-row ${i===record.bookmark?'bookmarked':''}" id="read-line-${i}"><div class="line-marker"><span>${String(i+1).padStart(3,'0')}${c.start!==null?` · ${timeLabel(c.start)}`:''}</span><button type="button" class="bookmark-button" data-bookmark="${i}" aria-label="${i+1}번 항목까지 읽음" aria-pressed="${i===record.bookmark}">${i===record.bookmark?'읽던 위치':'여기까지 읽음'}</button></div><div class="parallel-text"><p class="english" lang="en">${esc(c.english)}</p><p class="korean ${c.korean?'':'translation-missing'}" lang="ko">${esc(c.korean||'번역 없음')}</p></div><details class="line-note"><summary>${c.note?'내 메모 있음':'메모·해설'}</summary>${c.literal?`<p><strong>직역</strong> ${esc(c.literal)}</p>`:''}<label for="line-note-${i}">이 문장의 뜻·표현·배경에 대한 메모</label><textarea id="line-note-${i}" maxlength="20000">${esc(c.note)}</textarea><button type="button" class="button small secondary" data-save-note="${i}">메모 저장</button></details></article>`).join('')||'<p class="no-results">일치하는 항목이 없습니다.</p>';
      list.querySelectorAll('[data-bookmark]').forEach(b=>b.addEventListener('click',async()=>{record.bookmark=Number(b.dataset.bookmark);list.querySelectorAll('.reading-row').forEach(row=>row.classList.toggle('bookmarked',row.id===`read-line-${record.bookmark}`));list.querySelectorAll('[data-bookmark]').forEach(x=>{const on=Number(x.dataset.bookmark)===record.bookmark;x.setAttribute('aria-pressed',on);x.textContent=on?'읽던 위치':'여기까지 읽음';});if(await persist())notify('읽던 위치를 저장했습니다. 학습 완료와는 별도 기록입니다.');}));
      list.querySelectorAll('[data-save-note]').forEach(b=>b.addEventListener('click',async()=>{const i=Number(b.dataset.saveNote);record.cues[i].note=document.querySelector(`#line-note-${i}`).value;if(await persist()){b.closest('details').querySelector('summary').textContent=record.cues[i].note?'내 메모 있음':'메모·해설';notify('메모를 저장했습니다.');}}));
    }
    renderRows();
    let searchTimer;search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderRows,180);});
    toggle.addEventListener('change',()=>{list.classList.toggle('english-only',!toggle.checked);document.querySelector('.reading-column-head').classList.toggle('english-only',!toggle.checked);});
    document.querySelector('#reader-resume').addEventListener('click',()=>{search.value='';renderRows();document.querySelector(`#read-line-${record.bookmark}`).scrollIntoView({block:'center',behavior:'smooth'});});
    document.querySelector('#reader-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`newsroom-reader-${e.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    const unmatched=document.querySelector('#unmatched-translations');
    if(record.unmatched.length)unmatched.innerHTML=`<details><summary>영어와 연결되지 않은 한글 ${record.unmatched.length}개</summary><p class="reader-help">누락시키지 않고 따로 보관했습니다. 시간 보정이나 자료 판본을 확인해 주세요.</p>${record.unmatched.map(c=>`<p>${c.start!==null?`[${timeLabel(c.start)}] `:''}${esc(c.text)}</p>`).join('')}</details>`;
  }
}
