import bisect
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data'

def normalize(text):
    text = text.replace('\t', ' ').replace('\ufb01', 'fi').replace('\ufb02', 'fl')
    # Embedded PDF font maps several different ligatures to NUL.
    for broken, fixed in [('tra\x00c','traffic'), ('Tra\x00c','Traffic'), ('e\x00cien','efficien'), ('a\x00liat','affiliat'), ('a\x00nity','affinity'), ('o\x00ce','office'), ('su\x00cien','sufficien'), ('o\x00oad','offload'), ('o\x00ine','offline'), ('\x00ow','flow'), ('\x00eet','fleet'), ('\x00ag','flag'), ('\x00uct','fluct'), ('re\x00ect','reflect'), ('\x00exib','flexib'), ('\x00ight','flight'), ('\x00ood','flood')]:
        text = text.replace(broken, fixed)
    text = text.replace('\x00', 'fi')
    trans = str.maketrans({'А':'A', 'В':'B', 'С':'C', 'Е':'E'})
    text = re.sub(r'(?m)^([АВСЕ])\.', lambda m: m.group(0).translate(trans), text)
    text = re.sub(r'(Answer:\s*)([АВСЕ]+)', lambda m: m.group(1) + m.group(2).translate(trans), text)
    lines = []
    for line in text.splitlines():
        if re.match(r'\d\d/\d\d/\d{4},', line) or line.startswith('https://www.examtopics.com/exams/'):
            continue
        line = line.replace('CertyIQ', '').strip()
        lines.append(line)
    return '\n'.join(lines)

def compact(text):
    return re.sub(r'\s+', ' ', text).strip()

for exam in ('clf', 'saa'):
    pages = json.loads((DATA / f'{exam}-pages.json').read_text(encoding='utf-8'))
    chunks = [normalize(p['text']) for p in pages]
    starts, pos = [], 0
    for chunk in chunks:
        starts.append(pos)
        pos += len(chunk) + 1
    text = '\n'.join(chunks)
    header = r'Question:\s*(\d+)' if exam == 'clf' else r'(?:Topic\s+\d+\s*)?Question\s*#(\d+)(?:\s*Topic\s+\d+)?'
    matches = list(re.finditer(header, text))
    questions = []
    for index, match in enumerate(matches):
        number = int(match.group(1))
        body = text[match.end():matches[index + 1].start() if index + 1 < len(matches) else len(text)]
        key_match = re.search(r'(?:Correct )?Answer:\s*([A-H](?:[ ,]*[A-H])*)', body)
        content = body[:key_match.start()] if key_match else body
        choice_matches = list(re.finditer(r'^([A-H])\.\s*', content, re.M))
        choices = [{'id': m.group(1).lower(), 'text': compact(content[m.end():choice_matches[i+1].start() if i+1 < len(choice_matches) else len(content)])} for i, m in enumerate(choice_matches)]
        # The source prints two D labels in SAA Q125; preserve order and restore E.
        if exam == 'saa' and number == 125 and len(choices) == 5:
            choices[4]['id'] = 'e'
        prompt = compact(content[:choice_matches[0].start()]) if choices else compact(content)
        keys = re.findall(r'[A-H]', key_match.group(1)) if key_match else []
        votes = re.findall(r'([A-H]+)\s*\((\d+)%\)', body[key_match.end():] if key_match else '')
        issues = []
        if len(choices) < 4: issues.append('Missing answer choices')
        if not keys: issues.append('Missing PDF answer key')
        if any(k.lower() not in [c['id'] for c in choices] for k in keys): issues.append('Answer references absent choice')
        explanation = ''
        if exam == 'clf' and 'Explanation:' in body:
            explanation = compact(body.split('Explanation:',1)[1])
        questions.append({
            'id': f'{exam}-pdf-{number:03}', 'sourceQuestion': number,
            'sourcePage': bisect.bisect_right(starts, match.start()),
            'prompt': prompt, 'choices': choices,
            'sourceAnswers': [k.lower() for k in keys],
            'sourceExplanation': explanation,
            'communityAnswers': list(votes[0][0].lower()) if votes else [],
            'communityPercent': int(votes[0][1]) if votes else None,
            'importIssues': issues,
        })
    (DATA / f'{exam}-imported.json').write_text(json.dumps(questions, indent=2, ensure_ascii=False), encoding='utf-8')
    print(exam, 'questions:', len(questions), 'issues:', [(q['sourceQuestion'], q['importIssues']) for q in questions if q['importIssues']])
    missing = Counter(re.findall(r'\S*\x00\S*',text))
    print('Missing glyph words:', missing)
