import {renderReader} from './reader.mjs';
const KEY = 'newsroom-study.v1';
const main = document.querySelector('#main');
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
const esc = (v='') => String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : '#'; } catch { return '#'; } };
const link = (url,label,cls='')=>`<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const button = (href,label,secondary=false)=>`<a class="button${secondary?' secondary':''}" href="${href}">${label}</a>`;
const dateString = (date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays = (day,days)=>{const [y,m,d]=day.split('-').map(Number);const result=new Date(y,m-1,d,12);result.setDate(result.getDate()+days);return dateString(result);};
const isDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateString(new Date(`${value}T12:00:00`))===value;
let course, season=0, query='', toastTimer;
let state={version:1,units:{},drafts:{},quizzes:{},lastUnit:null};
let persistent=true;
try { const saved=localStorage.getItem(KEY); if(saved) { const parsed=JSON.parse(saved); if(parsed.version===1 && parsed.units && parsed.drafts && parsed.quizzes) state=parsed; } } catch { persistent=false; }
function notify(message) {const node=document.querySelector('#toast');node.textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.textContent='',5000);}
function save() {try {localStorage.setItem(KEY,JSON.stringify(state));return true;} catch {persistent=false;notify('브라우저 저장 공간을 사용할 수 없습니다. 떠나기 전에 진도를 내보내 주세요.');return false;}}
const allUnits = ()=>course.episodes.flatMap(e=>(e.units||[]).map((u,i)=>({...u,episode:e.id,index:i})));
const unitRoute = u=>`#lesson/${u.episode}/scene/${u.index}`;
function reviewItems() {return allUnits().flatMap(u=> {const record=state.units[u.id];if(!record?.studiedOn)return [];return course.intervals.map(day=>({unit:u,day,due:addDays(record.studiedOn,day),done:record.reviews?.[day]}));}).sort((a,b)=>a.due.localeCompare(b.due));}
function updateBadge() {const count=reviewItems().filter(x=>!x.done && x.due<=dateString()).length;const badge=document.querySelector('#due-badge');badge.hidden=!count;badge.textContent=count;}
function sourceLinks(sources) {return `<div class="sources-inline">${sources.map(s=>link(s.url,s.label)).join('')}</div>`;}
function sectionTitle(title,text) {return `<h2>${title}</h2><p class="lead">${text}</p>`;}
function renderCatalog() {
  const current=allUnits().find(u=>u.id===state.lastUnit) || allUnits()[0];
  const currentEpisode=course.episodes.find(e=>e.id===current.episode);
  const preparedCount=course.episodes.filter(e=>e.prepared).length;
  main.innerHTML=`<section class="hero"><div><span class="eyebrow">THE NEWSROOM / ENGLISH STUDY</span><h1>좋은 문장을 이해하고,<br>내 생각으로 <em>말하기.</em></h1><p class="hero-intro">에피소드의 흐름을 먼저 읽고, 필요한 표현을 깊이 공부합니다.<br>원문과 번역을 함께 읽은 뒤 나의 문장으로 바꿔 보세요.</p><div class="hero-meta"><span>3 SEASONS</span><span>25 EPISODES</span><span>READ THE WHOLE STORY</span></div></div><aside class="today"><span class="eyebrow">YOUR STUDY DESK</span><span class="chapter-code">S${currentEpisode.season} E${currentEpisode.number} · 장면 학습</span><h2>${esc(currentEpisode.title)}</h2><p class="description">${esc(current.title)}<br>전체 흐름을 읽고 필요한 대목의 해설을 확인하세요.</p>${button(`#reader/${currentEpisode.id}`,`연속 읽기 열기 <span aria-hidden="true">↗</span>`)}</aside></section><section aria-labelledby="catalog-title"><div class="section-head"><div><h2 id="catalog-title">에피소드 라이브러리</h2><p>방영 순서대로 쌓아가는 영어와 생각의 기록</p></div><span class="muted">${String(preparedCount).padStart(2,'0')} / ${course.episodes.length} 노트 작성 중</span></div><div class="catalog-controls"><div class="season-control" aria-label="시즌 필터">${[0,1,2,3].map(s=>`<button type="button" class="filter ${season===s?'active':''}" data-season="${s}" aria-pressed="${season===s}">${s===0?'전체':`Season ${s}`}</button>`).join('')}</div><label class="search"><span aria-hidden="true">⌕</span><span class="visually-hidden">에피소드 검색</span><input id="episode-search" type="search" placeholder="제목 또는 에피소드 검색" value="${esc(query)}"></label></div><div id="episode-grid" class="episode-grid"></div><p class="catalog-note">${esc(course.materialNote)} 원문 출처와 학습 노트는 각 에피소드에서 확인하세요.</p></section>`;
  renderCards();
  main.querySelectorAll('[data-season]').forEach(b=>b.addEventListener('click',()=>{season=Number(b.dataset.season);main.querySelectorAll('[data-season]').forEach(x=>{x.classList.toggle('active',Number(x.dataset.season)===season);x.setAttribute('aria-pressed',Number(x.dataset.season)===season);});renderCards();}));
  document.querySelector('#episode-search').addEventListener('input',e=>{query=e.target.value;renderCards();});
}
function renderCards() {
  const episodes=course.episodes.filter(e=>(!season||e.season===season)&&`${e.id} S${e.season}E${e.number} ${e.title}`.toLowerCase().includes(query.toLowerCase().trim()));
  document.querySelector('#episode-grid').innerHTML=episodes.length?episodes.map(e=>`<article class="episode-card"><div class="card-top"><span>SEASON ${e.season} / EP ${String(e.number).padStart(2,'0')}</span> <span class="tag ${e.prepared?'':'pending'}">${e.prepared?'도입부 노트 준비됨':'출처 확인 가능'}</span></div><h3><a href="#lesson/${e.id}/briefing">${esc(e.title)}</a></h3><p>${e.prepared?esc(e.focus):'장면별 학습 노트를 순서대로 준비합니다.'}</p><div class="card-bottom"><a href="#lesson/${e.id}/briefing">${e.prepared?'학습 노트 열기':'출처와 준비 상태'} <span aria-hidden="true">→</span></a><span class="muted">${e.prepared?`${e.briefing.length}개 배경 · ${e.units.length}개 구문`:'ENGLISH SOURCE'}</span></div></article>`).join(''):'<p class="no-results">일치하는 에피소드가 없습니다. 다른 제목이나 에피소드 번호로 검색해 보세요.</p>';
}
function renderLesson(id,tab='briefing',unitIndex=0) {
  const e=course.episodes.find(x=>x.id===id);
  if(!e){main.innerHTML=`<div class="error"><h1>에피소드를 찾을 수 없습니다.</h1>${button('#episodes','목록으로 돌아가기')}</div>`;return;}
  const tabs=[['briefing','배경 브리핑',e.briefing?.length],['scene','장면 학습',e.units?.length],['rhetoric','표현과 수사',''],['quiz','이해 확인',e.quiz?.length],['sources','출처','']];
  if(!tabs.some(t=>t[0]===tab))tab='briefing';
  main.innerHTML=`<div class="reader-head"><a class="back" href="#episodes">← 에피소드 라이브러리</a><span class="eyebrow">SEASON ${e.season} / EPISODE ${String(e.number).padStart(2,'0')} · ${e.prepared?'STUDY NOTES':'SOURCE DESK'}</span><h1>${esc(e.title)}</h1><p>${esc(e.summary||'영어 전사본의 출처를 먼저 확인할 수 있습니다. 학습 노트는 방영 순서대로 채워집니다.')}</p></div>${e.prepared?`<div class="reader-layout"><aside class="reader-aside"><nav class="reader-menu" aria-label="학습 노트 목차">${tabs.map(([key,label,count])=>`<a href="#lesson/${e.id}/${key}" class="${tab===key?'active':''}" ${tab===key?'aria-current="page"':''}>${label}<small>${count||''}</small></a>`).join('')}</nav><p class="aside-note">현재 준비 범위<br>배경 브리핑 + 도입부 두 구문<br><br>노트를 읽은 것과 직접 말할 수 있는 것은 다릅니다. 한 문장씩 확인하세요.</p></aside><article class="content" id="lesson-content"></article></div>`:renderPending(e)}`;
  if(!e.prepared)return;
  const content=document.querySelector('#lesson-content');
  if(tab==='briefing'){content.innerHTML=sectionTitle('뉴스가 시작되기 전','2012년 방영된 이야기 속에서, 2010년의 미국을 먼저 만납니다.')+e.briefing.map((b,i)=>`<section class="briefing-row"><span class="number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>${sourceLinks(b.sources)}</div></section>`).join('')+`<div class="content-next">${button(`#lesson/${e.id}/scene/0`,'첫 장면 공부하기 →')}</div>`;}
  if(tab==='scene')renderScene(e,unitIndex,content);
  if(tab==='rhetoric'){content.innerHTML=sectionTitle('문장의 힘을 내 것으로','아래 예문은 수업과 미팅에서 연습하도록 새로 쓴 문장입니다.')+e.rhetoric.map(r=>`<section class="rhetoric-item"><span class="en">${esc(r.en)}</span><h3>${esc(r.name)}</h3><p class="body-text">${esc(r.text)}</p><p class="original" lang="en">${esc(r.example)}</p></section>`).join('')+`<p class="note">현재 도입부에서 다룬 표현은 2개입니다. 에피소드별 15~25개는 학습을 이어가며 누적할 목표입니다.</p>${button('#expressions','표현 노트 열기',true)}`;}
  if(tab==='quiz')renderQuiz(e,content);
  if(tab==='sources'){content.innerHTML=sectionTitle('원문과 사실을 따로 확인하기','대사에서 말한 내용과 역사적 사실은 별도로 살펴봅니다.')+`<p class="body-text">${esc(course.sourceNote)}</p>${sourceLinks([{label:'영어 전사본',url:e.sourceUrl},...(e.secondaryUrl?[{label:'보조 자막 페이지',url:e.secondaryUrl}]:[])])}<details open><summary>이번 노트의 확인 범위</summary><p>첫 구문은 두 자료에서 문구가 일치합니다. 두 번째 구문은 주 전사본에서 확인했습니다. 화자와 HBO 재생 시간은 아직 대조하지 않았습니다.</p><p>첫 구문의 [00:30]은 HDTV.ASAP 자료의 웹 색인에서 확인한 참고 시간입니다. HBO 시간으로 단정하지 않습니다.</p><p>전사본 사이에 통계 순위 일부가 빠진 차이가 있습니다. 드라마 속 수치를 곧바로 사실로 받아들이지 않습니다.</p></details><details><summary>자료를 활용하는 방식</summary><p>짧은 인용에 직접 작성한 해설과 연습 예문을 붙입니다. 전사본 전문은 이 사이트에 보관하지 않습니다. 학습자의 답변과 복습 진도는 서버에 전송하지 않습니다.</p></details><p class="source-caption">출처 페이지 확인: ${e.sourceChecked}</p>${button('./notes/S01E01.md','Markdown 노트 열기',true)}`;}
}
function renderPending(e){return `<div class="pending-content"><span class="eyebrow">UP NEXT</span><h2>출처부터 준비해 두었습니다.</h2><p>이 에피소드의 전사본 페이지와 대사 본문 존재를 확인했습니다. 아직 장면별 해설을 작성하거나 문장 전체를 영상과 대조한 상태는 아닙니다.</p><ul class="pending-list"><li>영어 전사본 출처<span>페이지 확인됨</span></li><li>배경 브리핑 5~8개<span>준비 예정</span></li><li>장면 해설 · 핵심 표현 · 수사 기법<span>준비 예정</span></li><li>복습 퀴즈 5문항<span>준비 예정</span></li></ul>${link(e.sourceUrl,'영어 전사본 보기','button')}${e.secondaryUrl?link(e.secondaryUrl,'보조 출처','button secondary'):''}<p class="source-caption">${esc(course.sourceNote)}<br>페이지 확인: ${e.sourceChecked}</p>${button('#lesson/S01E01/briefing','준비된 S1E1 노트로 이동',true)}</div>`;}
function renderScene(e,index,content) {
  index=Number.isInteger(index)&&index>=0&&index<e.units.length?index:0;
  const u=e.units[index],record=state.units[u.id];
  content.innerHTML=`<div class="unit-nav" aria-label="학습 구문">${e.units.map((x,i)=>`<a class="unit-pill ${i===index?'active':''}" href="#lesson/${e.id}/scene/${i}" aria-label="구문 ${i+1}: ${esc(x.title)}" ${i===index?'aria-current="step"':''}>${String(i+1).padStart(2,'0')}</a>`).join('')}<p>${index+1} / ${e.units.length} PREPARED</p></div><span class="eyebrow">${esc(u.scene)}</span><h2>${esc(u.title)}</h2><p class="body-text">${esc(u.context)}</p><blockquote lang="en">${esc(u.quote)}</blockquote><p class="source-caption">${u.time?`참고 [${u.time}] · `:''}${esc(u.timeNote)}<br>${esc(u.verification)} ${link(u.sources[0].url,'원문 출처')}</p><div class="translations"><div><h3>직역</h3><p>${esc(u.literal)}</p></div><div><h3>자연스러운 의역</h3><p>${esc(u.natural)}</p></div></div><section class="content-section"><h3>문장이 작동하는 방식</h3><dl class="grammar">${u.grammar.map(g=>`<div><dt lang="en">${esc(g.label)}</dt><dd>${esc(g.text)}</dd></div>`).join('')}</dl></section><section class="content-section"><h3>어떤 태도로 들릴까?</h3><p class="register" lang="en">${esc(u.register)}</p><p class="body-text">${esc(u.nuance)}</p></section><section class="content-section"><h3>그 말 뒤의 맥락</h3><p class="body-text">${esc(u.reference)}</p>${u.referenceSource?sourceLinks([u.referenceSource]):''}</section><div class="example"><span class="eyebrow">IN YOUR NEXT MEETING · 직접 만든 예문</span><p class="english" lang="en">${esc(u.example)}</p><p class="ko">${esc(u.exampleKo)}</p></div><section class="practice" aria-labelledby="practice-heading"><span class="eyebrow">YOUR TURN</span><h3 id="practice-heading">이해하고, 내 문장으로 말하기</h3><p>${esc(u.check)}</p><details><summary>구조 해설 확인</summary><p>${esc(u.checkAnswer)}</p></details><label for="practice-answer"><p>${esc(u.prompt)}</p></label><textarea id="practice-answer" lang="en" placeholder="Your sentence, in your own words…" maxlength="5000">${esc(state.drafts[u.id]??record?.answer??'')}</textarea><label class="checkbox-label"><input type="checkbox" id="understood" ${record?'checked':''}><span>문장 구조를 설명할 수 있고, 내 예문을 소리 내어 말해 봤습니다.</span></label><div class="practice-actions"><button class="button" id="save-study">${record?'연습 기록 수정':'연습 완료로 기록'}</button><span class="saved-label" id="study-status">${record?`${record.studiedOn} 첫 학습 · 자기 확인`:''}</span></div><details><summary>연습한 뒤 예시 문장 보기</summary><p lang="en">${esc(u.model)}</p><p>가능한 문장 중 하나입니다. 자신의 문장을 먼저 만든 뒤 비교하세요.</p></details><p class="source-caption">답변은 이 브라우저에만 저장됩니다. 완료 버튼은 자기 확인 기록이며 자동 채점이 아닙니다. 첫 학습일을 기준으로 1·3·7·14·30일 뒤 복습을 안내합니다.</p></section><div class="content-next">${button(index+1<e.units.length?`#lesson/${e.id}/scene/${index+1}`:`#lesson/${e.id}/quiz`,index+1<e.units.length?'다음 구문 →':'이해 확인으로 →')}</div>`;
  const answer=document.querySelector('#practice-answer');
  answer.addEventListener('input',()=>{state.drafts[u.id]=answer.value;save();});
  document.querySelector('#save-study').addEventListener('click',()=>{
    const value=answer.value.trim();
    if(!value){notify('자신의 영어 문장을 먼저 적어 주세요.');answer.focus();return;}
    if(!document.querySelector('#understood').checked){notify('구조를 확인하고 소리 내어 연습한 뒤 체크해 주세요.');document.querySelector('#understood').focus();return;}
    const previous=state.units[u.id];
    state.units[u.id]={studiedOn:previous?.studiedOn||dateString(),answer:value,reviews:previous?.reviews||{}};
    state.lastUnit=u.id;const stored=save();updateBadge();
    document.querySelector('#study-status').textContent=`${state.units[u.id].studiedOn} 첫 학습 · 자기 확인`;
    document.querySelector('#save-study').textContent='연습 기록 수정';
    if(stored)notify('연습을 기록했습니다. 복습 일정에서 다음 단계를 확인하세요.');
  });
}
function renderQuiz(e,content) {
  content.innerHTML=sectionTitle('잠깐, 내 말로 설명해 볼까요?',`${esc(e.quizScope)}입니다. 답을 먼저 떠올린 뒤 해설을 펼쳐 보세요.`)+e.quiz.map((q,i)=>`<section class="quiz-card"><span class="eyebrow">QUESTION ${String(i+1).padStart(2,'0')} · ${esc(q.kind)}</span><h3><label for="quiz-${i}">${esc(q.q)}</label></h3><textarea id="quiz-${i}" data-quiz="${e.id}-${i}" maxlength="5000" placeholder="생각을 짧게 적거나 소리 내어 답해 보세요.">${esc(state.quizzes[`${e.id}-${i}`]||'')}</textarea><p class="save-note">답변은 이 브라우저에 자동 저장됩니다.</p><details><summary>해설 보기</summary><p>${esc(q.a)}</p></details></section>`).join('')+`<p class="note">이해가 모호한 구문은 다시 설명해 보고 자기 예문을 고쳐 보세요. 퀴즈를 열었다는 이유만으로 학습 완료 처리하지 않습니다.</p>`;
  content.querySelectorAll('[data-quiz]').forEach(t=>t.addEventListener('input',()=>{state.quizzes[t.dataset.quiz]=t.value;save();}));
}
function renderExpressions() {
  main.innerHTML=`<div class="page-head"><span class="eyebrow">THE EXPRESSION NOTEBOOK</span><h1>상황이 떠오르는 영어</h1><p>한국어 단서로 먼저 문장을 말해 보세요. 표현은 드라마에서 배운 구조를 일상적인 토론 상황에 맞게 변형했습니다.</p></div><div class="expression-list">${allUnits().map(u=>`<article class="expression-item"><div class="meta"><span>${u.episode} · ${esc(u.scene)}</span><span>${state.units[u.id]?'직접 연습함':'연습 전'}</span></div><h2 lang="en">${esc(u.expression)}</h2><p class="meaning">${esc(u.meaning)}</p><details><summary>예문과 사용 상황</summary><p class="english" lang="en">${esc(u.example)}</p><p>${esc(u.nuance)}</p><p>이 예문은 학습용으로 새로 쓴 문장입니다.</p></details><a class="text-link" href="${unitRoute(u)}">장면에서 다시 공부하기 →</a></article>`).join('')}</div><p class="catalog-note">현재 2개 표현을 준비했습니다. 각 에피소드를 공부하며 15~25개씩 누적합니다.</p>`;
}
function renderReview() {
  const today=dateString(),items=reviewItems(),due=items.filter(x=>!x.done&&x.due<=today),future=items.filter(x=>!x.done&&x.due>today),studied=Object.keys(state.units).filter(k=>allUnits().some(u=>u.id===k)).length;
  main.innerHTML=`<div class="page-head"><span class="eyebrow">BACK TO YOUR OWN WORDS</span><h1>다시 말할 수 있을 때까지</h1></div><div class="review-intro"><div><p class="body-text">연습을 완료한 날부터 1·3·7·14·30일 뒤에 다시 만납니다. 영어를 가리고 말해 본 뒤, 원래 문장과 비교하세요.</p><p class="source-caption">${today} · 기기의 현지 날짜 기준<br>정해진 간격은 조정 가능한 학습 운영안입니다. 자동 알림은 전송하지 않습니다.</p></div><div class="review-stats"><div><strong>${studied}</strong><span>직접 연습한 구문</span></div><div><strong>${due.length}</strong><span>오늘까지 복습할 항목</span></div><div><strong>${items.filter(x=>x.done).length}</strong><span>완료한 복습</span></div></div></div><section aria-labelledby="review-title"><div class="section-head"><h2 id="review-title">오늘의 복습</h2></div>${due.length?due.map(x=>reviewCard(x,true)).join(''):`<div class="empty-state"><h2>${studied?'All caught up.':'Start with one sentence.'}</h2><p>${studied?'오늘까지 예정된 복습을 모두 마쳤습니다. 다음 일정에 다시 떠올려 보세요.':'아직 연습 완료한 구문이 없습니다. 장면 학습에서 자신의 문장을 쓰고 이해를 확인하면 복습 날짜가 생깁니다.'}</p>${button('#lesson/S01E01/scene/0',studied?'장면으로 돌아가기 →':'첫 구문 연습하기 →')}</div>`}</section>${future.length?`<section><div class="section-head"><h2>다가오는 복습</h2></div>${future.slice(0,10).map(x=>reviewCard(x,false)).join('')}</section>`:''}<section class="backup"><h3>내 학습 기록 보관하기</h3><p>답변과 진도는 이 브라우저에만 보관됩니다. 다른 기기에서 이어가려면 파일을 내보낸 뒤 그 기기에서 불러오세요. 불러오기는 현재 기록을 교체하므로 먼저 백업할 수 있습니다.</p><p>${persistent?'브라우저 저장 사용 중':'브라우저 저장을 사용할 수 없습니다. 현재 기록을 파일로 보관해 주세요.'}</p><div class="backup-actions"><button class="button secondary" id="export-progress">진도 내보내기 ↓</button><button class="button secondary" id="choose-import">백업 불러오기 ↑</button><input id="import-file" type="file" accept="application/json,.json" hidden></div></section>`;
  main.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{const [id,day]=b.dataset.review.split('|');state.units[id].reviews[day]=dateString();const stored=save();renderReview();updateBadge();if(stored)notify('복습을 기록했습니다.');}));
  document.querySelector('#export-progress').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'newsroom-study',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`newsroom-progress-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.querySelector('#choose-import').addEventListener('click',()=>document.querySelector('#import-file').click());
  document.querySelector('#import-file').addEventListener('change',importProgress);
}
function reviewCard(x,action) {const activities={1:'뜻만 보고 영어 표현 말하기',3:'문장 구조 설명하고 정중하게 바꾸기',7:'새 주제로 30초 말하기',14:'다른 장면과 비교하고 맥락 설명하기',30:'실제로 사용한 예문 또는 역할극'};return `<article class="review-card"><div><span class="date">${x.due} · D+${x.day}</span><h3>${esc(x.unit.title)}</h3><p>${activities[x.day]} · ${x.unit.episode}</p></div><div class="practice-actions">${button(unitRoute(x.unit),'장면 열기',true)}${action?`<button class="button" data-review="${x.unit.id}|${x.day}">복습 완료</button>`:''}</div></article>`;}
function validateProgress(input) {
  if(input?.app!=='newsroom-study'||input.version!==1||!input.units||!input.drafts||!input.quizzes)throw Error('이 사이트에서 내보낸 진도 파일을 선택해 주세요.');
  const known=new Set(allUnits().map(u=>u.id)),quizKeys=new Set(course.episodes.flatMap(e=>(e.quiz||[]).map((_,i)=>`${e.id}-${i}`)));
  const result={version:1,units:{},drafts:{},quizzes:{},lastUnit:known.has(input.lastUnit)?input.lastUnit:null};
  const textValue=v=>{if(typeof v!=='string'||v.length>5000)throw Error('답변 형식이 올바르지 않습니다.');return v;};
  for(const [id,v] of Object.entries(input.units)) {if(!known.has(id))throw Error('이 사이트에 없는 구문의 기록이 포함되어 있습니다.');if(!isDate(v?.studiedOn)||v.studiedOn>dateString())throw Error('학습 날짜를 확인해 주세요.');const reviews={};for(const [day,date] of Object.entries(v.reviews||{})){if(!course.intervals.includes(Number(day))||!isDate(date)||date>dateString()||date<v.studiedOn)throw Error('복습 기록 형식이 올바르지 않습니다.');reviews[day]=date;}result.units[id]={studiedOn:v.studiedOn,answer:textValue(v.answer),reviews};}
  for(const [id,v] of Object.entries(input.drafts)) {if(!known.has(id))throw Error('알 수 없는 구문이 포함되어 있습니다.');result.drafts[id]=textValue(v);}
  for(const [id,v] of Object.entries(input.quizzes)) {if(!quizKeys.has(id))throw Error('알 수 없는 퀴즈가 포함되어 있습니다.');result.quizzes[id]=textValue(v);}
  return result;
}
async function importProgress(event) {
  const file=event.target.files?.[0];if(!file)return;
  try {if(file.size>1000000)throw Error('파일이 너무 큽니다. 이 사이트의 진도 백업 파일을 선택해 주세요.');const parsed=validateProgress(JSON.parse(await file.text()));if(!confirm('백업 파일의 기록으로 이 브라우저의 진도를 교체할까요? 기존 기록은 내보내기로 보관할 수 있습니다.'))return;state=parsed;const stored=save();renderReview();updateBadge();if(stored)notify('백업 기록을 불러왔습니다.');}catch(error){notify(error instanceof SyntaxError?'JSON 파일을 읽을 수 없습니다.':error.message);}finally{event.target.value='';}
}
function render({focus=false}={}) {
  const route=location.hash.slice(1).split('/');
  const page=route[0]||'reader';
  document.querySelectorAll('[data-nav]').forEach(n=>{const active=n.dataset.nav===(page==='lesson'?'episodes':page);n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
  if(page==='reader')renderReader(main,course,route[1]||'S01E01',notify).catch(()=>{main.innerHTML='<p class="error">읽기 화면을 열지 못했습니다. 페이지를 새로고침해 주세요.</p>';});
  else if(page==='lesson')renderLesson(route[1],route[2],Number(route[3]||0));
  else if(page==='expressions')renderExpressions();
  else if(page==='review')renderReview();
  else renderCatalog();
  updateBadge();
  document.title=`${page==='lesson'?(course.episodes.find(e=>e.id===route[1])?.title||'학습 노트'):page==='review'?'복습':page==='reader'?'영한 연속 읽기':page==='expressions'?'표현 노트':'영어와 생각의 연습'} | The Newsroom Study`;
  if(focus){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
try {
  const response=await fetch('./data/course.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);course=await response.json();
  // Invalid or old local state must not prevent access to learning materials.
  try {state=validateProgress({app:'newsroom-study',...state});} catch {state={version:1,units:{},drafts:{},quizzes:{},lastUnit:null};notify('이전 진도 형식을 읽을 수 없어 새 화면으로 열었습니다. 저장된 원본은 자동으로 덮어쓰지 않았습니다.');}
  render();window.addEventListener('hashchange',()=>render({focus:true}));
  window.addEventListener('storage',event=>{if(event.key!==KEY||!event.newValue)return;try{state=validateProgress({app:'newsroom-study',...JSON.parse(event.newValue)});render();}catch{/* Ignore invalid data from another tab. */}});
} catch(error) {main.innerHTML=`<div class="error"><h1>학습 자료를 불러오지 못했습니다.</h1><p>연결 상태를 확인하고 다시 열어 주세요.</p>${button('./','다시 시도')}${button('https://github.com/dongjae-kang/newsroom-study','GitHub 자료 보기',true)}</div>`;}
