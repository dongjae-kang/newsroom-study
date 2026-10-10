import test from 'node:test';
import assert from 'node:assert/strict';
import {parseText,alignText,validateReader,timeLabel} from '../assets/reader-core.mjs';
const srt='1\r\n00:00:01,000 --> 00:00:03,500\r\n<i>Let us review</i>\r\nthe evidence.\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nWhat is missing?';
test('SRT preserves multi-line speech, strips tags and parses comma milliseconds',()=>{
 const cues=parseText(srt);assert.equal(cues.length,2);assert.equal(cues[0].end,3.5);assert.equal(cues[0].text,'Let us review\nthe evidence.');
});
test('VTT ignores metadata and supports identifiers/settings and minute timestamps',()=>{
 const cues=parseText('\uFEFFWEBVTT\n\nNOTE example\nnot a cue\n\nSTYLE\n::cue {color:red;}\n\nintro\n01:02.300 --> 01:05.000 align:start\nA shared standard.');assert.equal(cues.length,1);assert.equal(cues[0].start,62.3);
});
test('incorrect timestamps fail visibly instead of silently losing speech',()=>{
 assert.throws(()=>parseText('1\n00:00:01 --> 00:00:04\nA'));assert.throws(()=>parseText('1\n00:61:01,000 --> 00:62:00,000\nA'));assert.throws(()=>parseText('1\n00:00:04,000 --> 00:00:01,000\nA'));
});
test('plain text retains every non-empty line',()=>{assert.deepEqual(parseText('One.\n\nTwo.').map(x=>x.text),['One.','Two.']);});
test('alignment can match split translations and exposes unmatched Korean',()=>{
 const result=alignText(parseText(srt),[{start:1,end:2,text:'근거를'},{start:2,end:3.5,text:'검토합시다.'},{start:10,end:11,text:'빠진 번역'}]);assert.equal(result.cues[0].korean,'근거를\n검토합시다.');assert.equal(result.cues[1].korean,'');assert.equal(result.unmatched.length,1);
});
test('alignment offset and unequal un-timed lengths',()=>{
 const en=[{start:1,end:3,text:'An example.'}],ko=[{start:11,end:13,text:'예시입니다.'}];assert.equal(alignText(en,ko,-10).cues[0].korean,'예시입니다.');assert.throws(()=>alignText(parseText('a\nb'),parseText('하나')));
});
test('English alone never produces invented Korean',()=>{assert.equal(alignText(parseText('A simple example.')).cues[0].korean,'');});
test('bilingual JSON is scoped to the selected episode and handles notes',()=>{
 const valid={app:'newsroom-reader',version:1,episode:'S01E01',cues:[{english:'What is our goal?',korean:'목표가 무엇인가요?',note:'An original practice example.'}],bookmark:100};assert.equal(validateReader(valid,'S01E01').bookmark,0);assert.throws(()=>validateReader(valid,'S01E02'));assert.throws(()=>validateReader({...valid,cues:[{english:3}]},'S01E01'));
});
test('time label preserves hour boundaries',()=>{assert.equal(timeLabel(3661.2),'1:01:01');assert.equal(timeLabel(61),'01:01');assert.equal(timeLabel(null),'');});

test('voice labels and literal angle brackets remain readable',()=>{const cues=parseText('WEBVTT\n\n00:01.000 --> 00:03.000\n<v Analyst>A value < threshold.</v>');assert.equal(cues[0].text,'Analyst: A value < threshold.');});
