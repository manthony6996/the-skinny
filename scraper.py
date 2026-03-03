"""
The Skinny On Living A Better Life — Daily RSS Scraper
Runs daily at 3AM ET via GitHub Actions
Fetches articles from 97 curated sources, generates AI hooks, stores in Supabase
"""

import os, json, hashlib, re
from datetime import datetime, timezone
import feedparser
import requests
from openai import OpenAI

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
OPENAI_KEY   = os.environ["OPENAI_API_KEY"]

client = OpenAI(api_key=OPENAI_KEY )

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def sb_get(path):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS)
    r.raise_for_status()
    return r.json()

def sb_post(path, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, json=data)
    return r.status_code

def generate_hook(title, excerpt, category):
    """Generate a killer hook using AI — Specific + Authority + Benefit formula"""
    try:
        prompt = f"""You write compelling content hooks for a daily curation site called "The Skinny On Living A Better Life."

Category: {category}
Original headline: {title}
Excerpt: {excerpt[:300] if excerpt else 'No excerpt available'}

Write ONE hook (max 15 words) that:
- Is specific and concrete (not vague)
- Creates genuine curiosity without clickbait
- Promises clear value to the reader
- Sounds like a trusted friend sharing something important
- Does NOT use: "discover", "shocking", "you won't believe", "secret"

Return ONLY the hook text, nothing else."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0.7
        )
        return response.choices[0].message.content.strip().strip('"')
    except Exception as e:
        print(f"  Hook generation failed: {e}")
        return title

def classify_content(published_dt):
    """Pulse Logic: breaking if < 24h, evergreen if older"""
    if not published_dt:
        return "evergreen"
    age_hours = (datetime.now(timezone.utc) - published_dt).total_seconds() / 3600
    return "breaking" if age_hours < 24 else "evergreen"

def parse_date(entry):
    """Extract and normalize published date from feed entry"""
    for field in ["published_parsed", "updated_parsed"]:
        t = getattr(entry, field, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None

def clean_text(text):
    """Strip HTML tags from text"""
    if not text:
        return ""
    return re.sub(r'<[^>]+>', '', text).strip()

def scrape_source(source):
    """Fetch and parse one RSS source, return list of article dicts"""
    articles = []
    try:
        feed = feedparser.parse(source["rss_url"], request_headers={"User-Agent": "TheSkinny/1.0"})
        entries = feed.entries[:8]  # Max 8 articles per source

        for entry in entries:
            title = clean_text(getattr(entry, "title", ""))
            url   = getattr(entry, "link", "")
            if not title or not url:
                continue

            excerpt = clean_text(
                getattr(entry, "summary", "") or
                getattr(entry, "description", "")
            )[:500]

            pub_dt = parse_date(entry)
            content_type = classify_content(pub_dt)

            # Generate AI hook
            print(f"  Generating hook for: {title[:60]}...")
            hook = generate_hook(title, excerpt, source["category"])

            # Create content hash for deduplication
            content_hash = hashlib.md5(url.encode()).hexdigest()

            articles.append({
                "source_id":    source["id"],
                "title":        title,
                "original_url": url,
                "ai_hook":      hook,
                "excerpt":      excerpt,
                "category":     source["category"],
                "content_type": content_type,
                "status":       "approved",  # Auto-approve; change to "pending" for manual review
                "published_at": pub_dt.isoformat() if pub_dt else None,
                "content_hash": content_hash,
                "tags":         []
            })

    except Exception as e:
        print(f"  ERROR scraping {source.get('name', 'unknown')}: {e}")

    return articles

def run():
    print(f"\n{'='*60}")
    print(f"THE SKINNY — Daily Scrape Starting")
    print(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*60}\n")

    # Get all active sources from Supabase
    sources = sb_get("sources?is_active=eq.true&select=*")
    print(f"Found {len(sources)} active sources\n")

    total_new = 0
    total_skipped = 0

    for i, source in enumerate(sources, 1):
        print(f"[{i}/{len(sources)}] {source['name']} ({source['category']})")
        articles = scrape_source(source)

        for article in articles:
            # Check for duplicates before inserting
            existing = sb_get(f"articles?content_hash=eq.{article['content_hash']}&select=id")
            if existing:
                total_skipped += 1
                continue

            status = sb_post("articles", article)
            if status in [200, 201]:
                total_new += 1
            else:
                print(f"  Insert failed with status {status}")

    # Log the scrape run
    sb_post("scrape_logs", {
        "sources_scraped": len(sources),
        "articles_found":  total_new + total_skipped,
        "articles_new":    total_new,
        "status":          "success"
    })

    print(f"\n{'='*60}")
    print(f"SCRAPE COMPLETE")
    print(f"New articles added: {total_new}")
    print(f"Duplicates skipped: {total_skipped}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    run()
