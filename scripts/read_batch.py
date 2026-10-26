import json, sys
from pathlib import Path
exam, start, end = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = json.loads((Path(__file__).resolve().parents[1] / f'src/data/{exam}-imported.json').read_text(encoding='utf-8'))
for q in items:
    if start <= q['sourceQuestion'] <= end:
        print(f"Q{q['sourceQuestion']} {q['prompt']}")
        candidate = q['communityAnswers'] or q['sourceAnswers']
        for choice in q['choices']:
            if len(sys.argv) > 4 and sys.argv[4] == 'brief' and choice['id'] not in candidate:
                continue
            print(f"{choice['id'].upper()}: {choice['text']}")
        print('PDF:', ''.join(q['sourceAnswers']).upper(), 'VOTE:', ''.join(q['communityAnswers']).upper(), q['communityPercent'])
