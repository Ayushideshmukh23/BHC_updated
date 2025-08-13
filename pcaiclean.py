# pcai_clean.py
import re, json, os

SOURCE_TXT = "pcai_site_data.txt"
OUT_JSON   = "pcai_cleaned_data.json"

NOISE = {
    "Home","Solutions","Products","Product","About","About us","About Us","Contact",
    "Book a Demo","Privacy Policy","Terms","Careers","Blog","LinkedIn","X",
}

def is_divider(s: str) -> bool:
    return bool(re.match(r"^=+$", s))

def is_garbage(s: str) -> bool:
    if not s or re.match(r"^[-. ]+$", s):  # lines of dots/dashes
        return True
    if "©" in s:
        return True
    if s in NOISE:
        return True
    return False

lines = []
with open(SOURCE_TXT, "r", encoding="utf-8") as f:
    for raw in f:
        lines.append(raw.rstrip("\n").strip())

data = []
current = {"url": "", "headings": [], "paragraphs": []}
section = None  # None | "headings" | "paragraphs"

def flush():
    if current["url"]:
        data.append({
            "url": current["url"],
            "headings": current["headings"],
            "content": " ".join(current["paragraphs"])
        })

for line in lines:
    if not line:
        continue

    if line.startswith("URL:"):
        # new page starts
        if current["url"]:
            flush()
        current = {"url": line.replace("URL:", "").strip(), "headings": [], "paragraphs": []}
        section = None
        continue

    if line.startswith("Headings:"):
        section = "headings"
        continue

    if line.startswith("Paragraphs:"):
        section = "paragraphs"
        continue

    if is_divider(line):
        section = None
        continue

    if is_garbage(line):
        continue

    if section == "headings":
        current["headings"].append(line)
    elif section == "paragraphs":
        current["paragraphs"].append(line)
    else:
        # outside a section; ignore
        pass

# flush last page
flush()

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Saved {len(data)} records to {OUT_JSON}")