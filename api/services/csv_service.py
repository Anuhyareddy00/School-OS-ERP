import csv
import io
from typing import List, Dict

def generate_csv(headers: List[str], rows: List[Dict]) -> bytes:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
    return output.getvalue().encode("utf-8")
