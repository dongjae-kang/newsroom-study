from pathlib import Path
from urllib.parse import urlparse
import json,re
root=Path(__file__).resolve().parents[1]
course=json.loads((root/'data/course.json').read_text())
assert len(course['episodes'])==25
assert [sum(e['season']==s for e in course['episodes']) for s in (1,2,3)]==[10,9,6]
ids=set(); units=set(); quoted=0
for e in course['episodes']:
    assert e['id'] not in ids; ids.add(e['id'])
    assert e['id'].lower() in e['sourceUrl']
    if not e['prepared']:
        assert not e.get('units'); continue
    assert 5<=len(e['briefing'])<=8
    assert len(e['quiz'])==5
    assert (root/'notes'/f"{e['id']}.md").exists()
    for u in e['units']:
        assert u['id'] not in units; units.add(u['id'])
        for key in ['quote','literal','natural','grammar','register','nuance','reference','example','check','prompt','verification','sources']:
            assert u[key],(u['id'],key)
        quoted+=len(u['quote'].split())
    for b in e['briefing']:
        for s in b['sources']:assert urlparse(s['url']).scheme=='https'
assert quoted<=25, 'Review the quotation budget before adding more sourced quotations.'
for f in [*root.glob('assets/*'),root/'index.html',root/'data/course.json',*root.glob('notes/*'),root/'README.md']:
    content=f.read_text()
    assert '\u2014' not in content,f'{f.name}: em dash'
    assert not re.search(r'/Users/|~/vault|~/Work|ghp_|github_pat_',content),f'{f.name}: local-only data'
assert 'sourceUrl' in course['episodes'][24]
print(f'PASS: 25 episode records; {len(units)} study units; 5 questions; {quoted} words in selective dialogue quotations; no local paths or em dashes in public content.')
