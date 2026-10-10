// Pure parsing and alignment. No network or browser storage access.
const MAX_CHARS = 3_000_000;
const MAX_CUES = 6000;
const clean = value => String(value).replace(/<v(?:\.[^ >]+)*\s+([^>]+)>/g,'$1: ').replace(/<\/?(?:i|b|u|c(?:\.[\w.-]+)?|v|lang|ruby|rt|font)(?:\s[^>]*)?>/g,'').replace(/<(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
function timestamp(value) {
  const parts=value.replace(',','.').split(':').map(Number);
  if(parts.length<2||parts.length>3||parts.some(x=>!Number.isFinite(x)||x<0)||parts.at(-1)>=60||parts.at(-2)>=60)throw Error('자막 시간 형식이 올바르지 않습니다.');
  return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
}
export function parseText(raw) {
  if(typeof raw!=='string'||!raw.trim())throw Error('자막 또는 원문 텍스트를 넣어 주세요.');
  if(raw.length>MAX_CHARS)throw Error('한 에피소드씩, 3MB 이하의 텍스트를 사용해 주세요.');
  const text=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if(text.includes('-->')||text.startsWith('WEBVTT')) {
    const cues=[];
    for(const block of text.split(/\n[ \t]*\n+/)) {
      if(/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(block.trim()))continue;
      const lines=block.split('\n');
      const line=lines.findIndex(x=>x.includes('-->'));
      if(line<0)continue;
      const match=lines[line].match(/^\s*((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})(?:\s.*)?$/);
      if(!match)throw Error('읽을 수 없는 시간 표기가 있습니다. SRT 또는 WebVTT 형식을 확인해 주세요.');
      const start=timestamp(match[1]),end=timestamp(match[2]);
      if(end<=start)throw Error('자막 종료 시간은 시작 시간보다 뒤여야 합니다.');
      const value=clean(lines.slice(line+1).join('\n'));
      if(value)cues.push({start,end,text:value});
    }
    if(!cues.length)throw Error('시간과 대사로 이루어진 자막 항목을 찾지 못했습니다.');
    if(cues.length>MAX_CUES)throw Error('한 에피소드당 6,000개 이하의 항목을 사용해 주세요.');
    return cues.sort((a,b)=>a.start-b.start);
  }
  const cues=text.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>({start:null,end:null,text:x}));
  if(cues.length>MAX_CUES)throw Error('한 에피소드당 6,000줄 이하의 텍스트를 사용해 주세요.');
  return cues;
}
export function alignText(english,korean=[],offset=0) {
  if(!Number.isFinite(offset)||Math.abs(offset)>3600)throw Error('번역 시간 보정은 -3600~3600초 범위로 입력해 주세요.');
  if(!korean.length)return {cues:english.map(e=>({...e,english:e.text,korean:'',literal:'',note:''})),unmatched:[],alignment:'english_only'};
  const timed=english.every(e=>e.start!==null)&&korean.every(e=>e.start!==null);
  if(!timed) {
    if(english.length!==korean.length)throw Error(`시간 없는 원문은 줄 수가 같아야 합니다. 영어 ${english.length}줄, 한글 ${korean.length}줄입니다.`);
    return {cues:english.map((e,i)=>({...e,english:e.text,korean:korean[i].text,literal:'',note:''})),unmatched:[],alignment:'line_order'};
  }
  const used=new Set();
  const cues=english.map(e=>{
    const matches=korean.map((k,index)=>({k,index})).filter(({k})=>Math.min(e.end,k.end+offset)>Math.max(e.start,k.start+offset));
    matches.forEach(({index})=>used.add(index));
    return {...e,english:e.text,korean:matches.map(({k})=>k.text).join('\n'),literal:'',note:''};
  });
  return {cues,unmatched:korean.filter((_,i)=>!used.has(i)),alignment:'time_overlap'};
}
export function validateReader(input,episode) {
  if(input?.app!=='newsroom-reader'||input.version!==1||input.episode!==episode)throw Error('선택한 에피소드와 같은 연속 읽기 JSON 파일을 사용해 주세요.');
  if(!Array.isArray(input.cues)||!input.cues.length||input.cues.length>MAX_CUES)throw Error('유효한 읽기 항목이 없습니다.');
  if(JSON.stringify(input).length>MAX_CHARS)throw Error('읽기 파일은 3MB 이하로 준비해 주세요.');
  const bounded=(v,required=false)=>{if(v===undefined||v===null)v='';if(typeof v!=='string'||v.length>20000||(required&&!v.trim()))throw Error('본문 형식이 올바르지 않습니다.');return v;};
  const cues=input.cues.map(c=>{
    const start=c.start??null,end=c.end??null;
    if(start!==null&&(!Number.isFinite(start)||start<0||!Number.isFinite(end)||end<=start))throw Error('읽기 파일의 시간을 확인해 주세요.');
    return {start,end,english:bounded(c.english,true),korean:bounded(c.korean),literal:bounded(c.literal),note:bounded(c.note)};
  });
  const unmatched=(Array.isArray(input.unmatched)?input.unmatched:[]).map(c=>({start:Number.isFinite(c.start)?c.start:null,text:bounded(c.text,true)}));
  const bookmark=Number.isInteger(input.bookmark)?Math.max(0,Math.min(cues.length-1,input.bookmark)):0;
  return {app:'newsroom-reader',version:1,episode,cues,unmatched,bookmark,alignment:['time_overlap','line_order','english_only','provided_pairs'].includes(input.alignment)?input.alignment:'provided_pairs',englishName:bounded(input.englishName),koreanName:bounded(input.koreanName)};
}
export function timeLabel(seconds) {
  if(seconds===null||seconds===undefined)return '';
  const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=Math.floor(seconds%60);
  return (h?`${h}:`:'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
