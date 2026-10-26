import json
from pathlib import Path
import pdfplumber

root = Path(__file__).resolve().parents[1]
result = []
with pdfplumber.open(r'C:\Users\USER\Downloads\aws-certified-cloud-practitioner-clf-c02_.pdf') as pdf:
    for i, page in enumerate(pdf.pages):
        result.append({'page': i + 1, 'text': page.extract_text() or ''})
        if i % 20 == 0:
            print(f'CLF reading order: {i + 1}/90', flush=True)
(root / 'src/data/clf-pages.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print('CLF complete', flush=True)
