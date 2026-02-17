import os
import re
import json
import time
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from twikit import Client

# --- Configuration ---
USERNAME = os.environ.get("X_USERNAME", "roshnibegamm")
EMAIL = os.environ.get("X_EMAIL", "tomework55@gmail.com")
PASSWORD = os.environ.get("X_PASSWORD", "2k20ww??RRSS")
COOKIES_FILE = "cookies.json"
CACHE_TTL_SECONDS = 30 * 60  # 30 minutes

SEARCH_QUERIES = [
    "product building",
    "AI tools",
    "UX design",
    "SaaS launch",
    "side project",
    "startup lesson",
    "building in public",
]

# When a specific hook filter is active, only search these 2 targeted queries
FILTER_QUERIES = {
    "Question Hook": ["AI tools", "UX design"],
    "Controversial Take": ["startup lesson", "SaaS launch"],
    "Personal Story": ["building in public", "side project"],
    "List/Framework": ["product building", "AI tools"],
    "Show & Tell": ["side project", "SaaS launch"],
    "Fill in the Blank": ["product building", "AI tools"],
    "Contrarian": ["startup lesson", "AI tools"],
    "Observation": ["product building", "building in public"],
}

# --- Cache ---
_cache: dict = {"data": None, "timestamp": 0}

# --- Twikit client ---
client = Client(language="en-US")


async def init_client():
    """Login or load cookies on startup."""
    print(f"[TrendPulse] CWD: {os.getcwd()}")
    print(f"[TrendPulse] X_COOKIES_JSON set: {bool(os.environ.get('X_COOKIES_JSON'))}")

    # Support cookies via env var (for Railway/cloud deployment)
    cookies_env = os.environ.get("X_COOKIES_JSON")
    if cookies_env:
        try:
            with open(COOKIES_FILE, "w") as f:
                f.write(cookies_env)
            print(f"[TrendPulse] Wrote cookies to {os.path.abspath(COOKIES_FILE)}")
        except Exception as e:
            print(f"[TrendPulse] Failed to write cookies file: {e}")

    if os.path.exists(COOKIES_FILE):
        try:
            client.load_cookies(COOKIES_FILE)
            print("[TrendPulse] Loaded cookies from file.")
        except Exception as e:
            print(f"[TrendPulse] Failed to load cookies: {e}")
    else:
        print(f"[TrendPulse] No cookies file at {os.path.abspath(COOKIES_FILE)}")
        try:
            print("[TrendPulse] Logging in to X...")
            await client.login(
                auth_info_1=USERNAME,
                auth_info_2=EMAIL,
                password=PASSWORD,
            )
            client.save_cookies(COOKIES_FILE)
            print("[TrendPulse] Login successful, cookies saved.")
        except Exception as e:
            print(f"[TrendPulse] Login failed: {e}")
            print("[TrendPulse] Starting without auth — API will return empty results.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_client()
    except Exception as e:
        print(f"[TrendPulse] Startup error (non-fatal): {e}")
    yield


# --- App ---
app = FastAPI(title="TrendPulse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Hook pattern detection ---
HOOK_PATTERNS = {
    "Question Hook": {
        "check": lambda t: "?" in t
        or bool(
            re.match(
                r"^(How|Why|What|Is|Does|Has|Should|Would|Can)\b", t, re.IGNORECASE
            )
        ),
        "template": "What's the one [topic] lesson you learned too late?",
    },
    "Controversial Take": {
        "check": lambda t: any(
            phrase in t.lower()
            for phrase in [
                "unpopular opinion",
                "hot take",
                "stop",
                "overrated",
                "nobody talks about",
                "wrong about",
                "overhyped",
                "myth",
                "controversial",
            ]
        ),
        "template": "Unpopular opinion: [common practice] is actually hurting your [outcome]",
    },
    "Personal Story": {
        "check": lambda t: any(
            phrase in t.lower()
            for phrase in [
                "i built",
                "i launched",
                "i quit",
                "i failed",
                "my experience",
                "i learned",
                "after x years",
                "i spent",
                "i made",
                "i lost",
                "i grew",
                "story time",
            ]
        ),
        "template": "I [did X] for [time period]. Here's what actually happened.",
    },
    "List/Framework": {
        "check": lambda t: bool(
            re.search(
                r"\d+\s*(things|lessons|ways|tips|steps|rules|mistakes|reasons)",
                t,
                re.IGNORECASE,
            )
        )
        or any(
            word in t.lower()
            for word in ["framework", "playbook", "guide", "checklist"]
        ),
        "template": "[Number] [topic] mistakes I see [audience] make every week",
    },
    "Show & Tell": {
        "check": lambda t: any(
            phrase in t.lower()
            for phrase in [
                "check out",
                "just launched",
                "built this",
                "shipped",
                "side project",
                "open source",
                "here's what",
                "demo",
            ]
        ),
        "template": "Just shipped [thing] that [solves problem]. Here's what I'd do differently.",
    },
    "Fill in the Blank": {
        "check": lambda t: any(
            phrase in t.lower()
            for phrase in [
                "what's your",
                "what would you",
                "how would you",
                "name one",
                "drop your",
                "share your",
            ]
        ),
        "template": "What's the one [tool/practice] you can't live without for [task]?",
    },
    "Contrarian": {
        "check": lambda t: any(
            phrase in t.lower()
            for phrase in [
                "actually",
                "the real reason",
                "truth about",
                "you don't need",
                "forget about",
                "the problem with",
            ]
        ),
        "template": "The real reason [common belief] doesn't work: [insight]",
    },
}


def detect_hooks(text: str) -> list[dict]:
    """Detect hook patterns in tweet text. Returns list of {name, template}."""
    matched = []
    for name, cfg in HOOK_PATTERNS.items():
        if cfg["check"](text):
            matched.append({"name": name, "template": cfg["template"]})
    if not matched:
        matched.append(
            {
                "name": "Observation",
                "template": "Something I've noticed about [topic] that nobody's talking about:",
            }
        )
    return matched


def parse_tweet(tweet) -> dict:
    """Extract structured data from a Twikit Tweet object."""
    now = datetime.now(timezone.utc)

    created_at_str = tweet.created_at or ""
    try:
        created_dt = tweet.created_at_datetime
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
    except Exception:
        created_dt = now

    hours_ago = max((now - created_dt).total_seconds() / 3600, 0.01)

    user = tweet.user
    author_handle = user.screen_name if user else "unknown"
    author_name = user.name if user else "Unknown"
    author_followers = user.followers_count if user else 0

    likes = tweet.favorite_count or 0
    retweets = tweet.retweet_count or 0
    replies = tweet.reply_count or 0
    views = tweet.view_count

    engagement_velocity = round((replies + retweets) / hours_ago, 2)

    text = tweet.full_text or tweet.text or ""
    hooks = detect_hooks(text)

    return {
        "id": tweet.id,
        "text": text,
        "author_name": author_name,
        "author_handle": author_handle,
        "author_followers": author_followers,
        "likes": likes,
        "retweets": retweets,
        "replies": replies,
        "views": views,
        "created_at": created_at_str,
        "url": f"https://x.com/{author_handle}/status/{tweet.id}",
        "hours_ago": round(hours_ago, 1),
        "engagement_velocity": engagement_velocity,
        "hook_patterns": [h["name"] for h in hooks],
        "remix_template": hooks[0]["template"],
    }


async def fetch_trends(queries: list[str], hook_filter: str | None = None) -> list[dict]:
    """Fetch tweets from X, deduplicate, score, and return top 30."""
    seen_ids: set[str] = set()
    all_tweets: list[dict] = []

    for query in queries:
        try:
            results = await client.search_tweet(query, "Latest", count=20)
            for tweet in results:
                if tweet.id not in seen_ids:
                    seen_ids.add(tweet.id)
                    parsed = parse_tweet(tweet)
                    # If filtering by hook, only keep matching tweets
                    if hook_filter and hook_filter not in parsed["hook_patterns"]:
                        continue
                    all_tweets.append(parsed)
        except Exception as e:
            print(f"[TrendPulse] Error searching '{query}': {e}")
            if "429" in str(e) or "Rate limit" in str(e):
                break

    all_tweets.sort(key=lambda t: t["engagement_velocity"], reverse=True)
    return all_tweets[:30]


@app.get("/api/trends")
async def get_trends(force: bool = False, filter: str | None = None):
    now = time.time()
    hook_filter = filter if filter and filter != "All" else None

    # For "All" or no filter, use the main cache
    if not hook_filter:
        if (
            not force
            and _cache["data"] is not None
            and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS
        ):
            return {
                "tweets": _cache["data"],
                "cached": True,
                "fetched_at": _cache["timestamp"],
            }
        tweets = await fetch_trends(SEARCH_QUERIES)
        if tweets:
            _cache["data"] = tweets
            _cache["timestamp"] = now
            return {"tweets": tweets, "cached": False, "fetched_at": now}
        if _cache["data"]:
            return {
                "tweets": _cache["data"],
                "cached": True,
                "fetched_at": _cache["timestamp"],
            }
        return {"tweets": [], "cached": False, "fetched_at": now}

    # Filtered refresh — only search 2 targeted queries
    queries = FILTER_QUERIES.get(hook_filter, SEARCH_QUERIES[:2])
    tweets = await fetch_trends(queries, hook_filter=hook_filter)
    if tweets:
        return {"tweets": tweets, "cached": False, "fetched_at": now}
    # Fallback: filter from main cache
    if _cache["data"]:
        filtered = [t for t in _cache["data"] if hook_filter in t["hook_patterns"]]
        return {"tweets": filtered, "cached": True, "fetched_at": _cache["timestamp"]}
    return {"tweets": [], "cached": False, "fetched_at": now}


@app.get("/")
async def root():
    return {"app": "TrendPulse", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
