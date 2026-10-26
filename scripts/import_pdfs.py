"""Extract the supplied PDF banks, preserving source pages and original keys."""
import json
import re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'src' / 'data'
DEST.mkdir(parents=True, exist_ok=True)
FILES = {
    'clf': Path(r'C:\Users\USER\Downloads\aws-certified-cloud-practitioner-clf-c02_.pdf'),
    'saa': Path(r'C:\Users\USER\Downloads\AWS Certified Solutions Architect - Associate SAA-C03 Exam - Free Exam QAs Page 1 _ ExamTopic.pdf'),
}

for exam, path in FILES.items():
    cache = DEST / f'{exam}-pages.json'
    if cache.exists():
        pages = json.loads(cache.read_text(encoding='utf-8'))
    else:
        pdf = PdfReader(str(path))
        pages = []
        for index, page in enumerate(pdf.pages):
            pages.append({'page': index + 1, 'text': page.extract_text() or ''})
            if index % 30 == 0:
                print(f'{exam}: extracted page {index + 1}/{len(pdf.pages)}', flush=True)
        cache.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    print(f'{exam}: {len(pages)} pages cached', flush=True)
