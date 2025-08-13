# pcai_scrape.py
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urldefrag
import time

BASE = "https://www.powerconnect.ai"
SEEDS = [
    "https://www.powerconnect.ai/",
    "https://www.powerconnect.ai/about-us/",
]

visited = set()
site_data = {}

def norm(u: str) -> str:
    # drop fragments (#...), keep https only, strip trailing slashes consistently
    u, _ = urldefrag(u)
    u = u.strip()
    if u.endswith("/"):
        u = u[:-1]
    return u

def scrape_page(url):
    print(f"Scraping: {url}")
    try:
        resp = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        texts = [p.get_text(strip=True) for p in soup.find_all("p")]
        headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"])]

        site_data[url] = {
            "headings": headings,
            "paragraphs": texts,
        }

        links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"]
            full = urljoin(url, href)
            full = norm(full)
            # same host, starts with base
            if urlparse(full).netloc == urlparse(BASE).netloc and full.startswith(BASE):
                # simple file filter (skip assets)
                if not any(full.lower().endswith(ext) for ext in (".pdf", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif")):
                    links.add(full)
        return links
    except Exception as e:
        print(f"Failed to scrape {url}: {e}")
        return set()

to_visit = {norm(u) for u in SEEDS}
base_host = urlparse(BASE).netloc

while to_visit:
    current = to_visit.pop()
    if current not in visited:
        visited.add(current)
        new_links = scrape_page(current)
        to_visit.update(new_links - visited)
        time.sleep(0.8)  # be polite

with open("pcai_site_data.txt", "w", encoding="utf-8") as f:
    for page, content in site_data.items():
        f.write(f"\nURL: {page}\n")
        f.write("Headings:\n" + "\n".join(content["headings"]) + "\n")
        f.write("Paragraphs:\n" + "\n".join(content["paragraphs"]) + "\n")
        f.write("\n" + "="*60 + "\n")

print("✅ Done! Content saved to pcai_site_data.txt")
