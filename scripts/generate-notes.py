from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
course=json.loads((root/'data/course.json').read_text())
for e in course['episodes']:
    if not e['prepared']: continue
    lines=[f"# {e['id']} {e['title']}",'','상태: 도입부 학습 자료 준비됨. 에피소드 전체 학습 노트는 작성 중입니다. 준비된 자료와 학습자의 이해 확인은 별도로 관리합니다.','',f"[웹에서 공부하기](https://dongjae-kang.github.io/newsroom-study/#lesson/{e['id']}/briefing)",'','## 배경 브리핑','']
    for i,b in enumerate(e['briefing'],1):
        links=' · '.join(f"[{s['label']}]({s['url']})" for s in b['sources'])
        lines += [f"{i}. **{b['title']}**. {b['text']} {links}",'']
    for i,u in enumerate(e['units'],1):
        lines += [f"## 도입부 구문 {i}: {u['title']}",'',f"장면: {u['scene']}",'',u['context'],'',f"> {u['quote']}",'',f"**직역**: {u['literal']}",'',f"**자연스러운 의역**: {u['natural']}",'','**문장 구조**','']
        lines += [f"- `{g['label']}`: {g['text']}" for g in u['grammar']]
        lines += ['',f"**격과 뉘앙스**: {u['register']}. {u['nuance']}",'',f"**맥락**: {u['reference']}",'',f"**직접 만든 예문**: {u['example']}",'',u['exampleKo'],'',f"**이해 확인**: {u['check']}",'',f"**발화 연습**: {u['prompt']}",'',f"위치: {'['+u['time']+'] ' if u['time'] else ''}{u['timeNote']}",'',u['verification'],'',' · '.join(f"[{s['label']}]({s['url']})" for s in u['sources']),'']
    lines += ['## 핵심 표현','',f"현재 {len(e['units'])}개 준비됨. 에피소드마다 15~25개로 누적합니다.",'','| 표현 | 뜻 | 직접 만든 예문 |','|---|---|---|']
    lines += [f"| {u['expression']} | {u['meaning']} | {u['example']} |" for u in e['units']]
    lines += ['','## 수사 기법','']
    for r in e['rhetoric']:lines += [f"### {r['name']} ({r['en']})",'',r['text'],'',f"직접 만든 연습 예문: {r['example']}",'']
    lines += ['## 이해 확인 퀴즈','',e['quizScope']+'. 에피소드 전체 학습 완료를 의미하지 않습니다.','']
    for i,q in enumerate(e['quiz'],1):lines += [f"{i}. {q['q']}",'']
    lines += ['<details>','<summary>답변 후 해설 보기</summary>','']
    for i,q in enumerate(e['quiz'],1):lines += [f"{i}. {q['a']}",'']
    lines += ['</details>','','## 복습','','해당 구문을 직접 연습한 날을 D0로 삼아 1·3·7·14·30일 뒤 다시 말해 봅니다. 자료 작성일이 학습 완료일은 아닙니다. 웹의 자기 확인 기록은 이 브라우저에 저장됩니다. 자동 알림은 설정하지 않았습니다.','']
    (root/'notes'/f"{e['id']}.md").write_text('\n'.join(lines))
print('Generated Markdown notes from course.json.')
