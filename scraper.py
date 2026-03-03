"""
The Skinny On Living A Better Life — Daily RSS Scraper
Runs daily at 3AM ET via GitHub Actions
"""

import os, hashlib, re
from datetime import datetime, timezone
import feedparser
import requests
from openai import OpenAI

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dsjccknnpbhfzbnxvcoq.supabase.co" )
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
OPENAI_KEY   = os.environ.get("OPENAI_API_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

HEADERS_WRITE = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def sb_get(path):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS)
    print(f"  GET {path[:60]} → {r.status_code}")
    if r.status_code != 200:
        print(f"  Response: {r.text[:300]}")
    r.raise_for_status()
    return r.json()

def sb_post(path, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS_WRITE, json=data)
    return r.status_code

def generate_hook(title, excerpt, category):
    try:
        client = OpenAI(api_key=OPENAI_KEY)
        prompt = f"""Write ONE compelling hook (max 15 words) for this {category} article.
Headline: {title}
Excerpt: {excerpt[:200] if excerpt else ''}
Rules: specific, no clickbait, sounds like a trusted friend sharing something valuable.
Return ONLY the hook text."""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0.7
        )
        return response.choices[0].message.content.strip().strip('"')
    except Exception as e:
        print(f"  Hook failed: {e}")
        return title

def classify_content(published_dt):
    if not published_dt:
        return "evergreen"
    age_hours = (datetime.now(timezone.utc) - published_dt).total_seconds() / 3600
    return "breaking" if age_hours < 24 else "evergreen"

def parse_date(entry):
    for field in ["published_parsed", "updated_parsed"]:
        t = getattr(entry, field, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', text).strip()

def scrape_source(source):
    articles = []
    try:
        feed = feedparser.parse(source["rss_url"],
            request_headers={"User-Agent": "TheSkinny/1.0"})
        for entry in feed.entries[:8]:
            title = clean_text(getattr(entry, "title", ""))
            url   = getattr(entry, "link", "")
            if not title or not url:
                continue
            excerpt = clean_text(getattr(entry, "summary", "") or
                                 getattr(entry, "description", ""))[:500]
            pub_dt = parse_date(entry)
            hook   = generate_hook(title, excerpt, source["category"])
            articles.append({
                "source_id":    source["id"],
                "title":        title,
                "original_url": url,
                "ai_hook":      hook,
                "excerpt":      excerpt,
                "category":     source["category"],
                "content_type": classify_content(pub_dt),
                "status":       "approved",
                "published_at": pub_dt.isoformat() if pub_dt else None,
                "content_hash": hashlib.md5(url.encode()).hexdigest(),
                "tags":         []
            })
    except Exception as e:
        print(f"  ERROR: {source.get('name')}: {e}")
    return articles

def run():
    print(f"\n{'='*60}")
    print(f"THE SKINNY — Daily Scrape")
    print(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"SUPABASE_KEY set: {'YES (' + SUPABASE_KEY[:12] + '...)' if SUPABASE_KEY else 'NO!'}")
    print(f"OPENAI_KEY set:   {'YES' if OPENAI_KEY else 'NO!'}")
    print(f"{'='*60}\n")

    if not SUPABASE_KEY:
        print("FATAL: SUPABASE_KEY not set. Add it to GitHub Secrets.")
        exit(1)

    sources = sb_get("sources?is_active=eq.true&select=*")
    print(f"\nLoaded {len(sources)} sources\n")

    total_new = total_skip = 0

    for i, source in enumerate(sources, 1):
        print(f"[{i}/{len(sources)}] {source['name']} ({source['category']})")
        for article in scrape_source(source):
            existing = sb_get(f"articles?content_hash=eq.{article['content_hash']}&select=id")
            if existing:
                total_skip += 1
                continue
            if sb_post("articles", article) in [200, 201]:
                total_new += 1

    sb_post("scrape_logs", {
        "sources_scraped": len(sources),
        "articles_found":  total_new + total_skip,
        "articles_new":    total_new,
        "status":          "success"
    })

    print(f"\n{'='*60}")
    print(f"DONE — New: {total_new} | Skipped: {total_skip}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    run()

