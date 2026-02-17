import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const HOOK_COLORS = {
  "Question Hook": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Controversial Take": "bg-red-500/20 text-red-400 border-red-500/30",
  "Personal Story": "bg-green-500/20 text-green-400 border-green-500/30",
  "List/Framework": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Show & Tell": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Fill in the Blank": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Contrarian: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Observation: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const ALL_PATTERNS = [
  "All",
  "Question Hook",
  "Controversial Take",
  "Personal Story",
  "List/Framework",
  "Show & Tell",
  "Fill in the Blank",
  "Contrarian",
  "Observation",
];

function formatNumber(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function CopiedToast({ visible }) {
  return (
    <div
      className={`fixed bottom-6 right-6 bg-[#3b82f6] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-opacity duration-300 z-50 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      Copied!
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-[#1a1a1a] bg-[#111111] rounded-xl p-5 mb-4 animate-pulse">
      {/* Author row skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-28 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-20 bg-[#1a1a1a] rounded" />
        <div className="h-3 w-16 bg-[#1a1a1a] rounded" />
      </div>
      {/* Text skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-[#1a1a1a] rounded" />
        <div className="h-4 w-full bg-[#1a1a1a] rounded" />
        <div className="h-4 w-3/4 bg-[#1a1a1a] rounded" />
      </div>
      {/* Badges skeleton */}
      <div className="flex gap-2 mb-3">
        <div className="h-6 w-24 bg-[#1a1a1a] rounded-full" />
        <div className="h-6 w-20 bg-[#1a1a1a] rounded-full" />
      </div>
      {/* Stats skeleton */}
      <div className="flex gap-3 mb-3">
        <div className="h-4 w-12 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-10 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-10 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-10 bg-[#1a1a1a] rounded" />
        <div className="h-4 w-16 bg-[#1a1a1a] rounded" />
      </div>
      {/* Link skeleton */}
      <div className="h-4 w-20 bg-[#1a1a1a] rounded mb-3" />
      {/* Remix box skeleton */}
      <div className="border border-[#1a1a1a] rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="h-4 w-3/4 bg-[#1a1a1a] rounded" />
        <div className="h-7 w-14 bg-[#1a1a1a] rounded" />
      </div>
    </div>
  );
}

function TweetCard({ tweet, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tweet.remix_template);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedText =
    tweet.text.length > 280 ? tweet.text.slice(0, 280) + "..." : tweet.text;

  return (
    <div className="border border-[#1a1a1a] bg-[#111111] rounded-xl p-5 mb-4">
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-bold text-white">{tweet.author_name}</span>
        <span className="text-gray-500">@{tweet.author_handle}</span>
        <span className="text-gray-600 text-sm">
          {formatNumber(tweet.author_followers)} followers
        </span>
      </div>

      {/* Tweet text */}
      <p className="text-gray-200 mb-3 leading-relaxed whitespace-pre-wrap break-words">
        {truncatedText}
      </p>

      {/* Hook pattern badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {tweet.hook_patterns.map((pattern) => (
          <span
            key={pattern}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              HOOK_COLORS[pattern] || HOOK_COLORS["Observation"]
            }`}
          >
            {pattern}
          </span>
        ))}
      </div>

      {/* Engagement stats */}
      <div className="flex items-center gap-3 text-sm text-gray-400 mb-3 flex-wrap">
        <span title="Engagement Velocity">
          🔥 {tweet.engagement_velocity.toFixed(1)}
        </span>
        <span>❤️ {formatNumber(tweet.likes)}</span>
        <span>🔁 {formatNumber(tweet.retweets)}</span>
        <span>💬 {formatNumber(tweet.replies)}</span>
        {tweet.views != null && <span>👁 {formatNumber(tweet.views)}</span>}
        <span className="text-gray-600">Posted {tweet.hours_ago}h ago</span>
      </div>

      {/* View on X link */}
      <a
        href={tweet.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#3b82f6] text-sm hover:underline inline-block mb-3"
      >
        View on X &rarr;
      </a>

      {/* Remix template box */}
      <div className="border border-[#1a1a1a] rounded-lg p-3 flex items-start justify-between gap-3">
        <p className="text-gray-400 text-sm italic flex-1">
          {tweet.remix_template}
        </p>
        <button
          onClick={handleCopy}
          className="text-xs bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30 px-3 py-1.5 rounded-md hover:bg-[#3b82f6]/30 transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [fetchedAt, setFetchedAt] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState(null);

  const fetchData = useCallback(
    async (force = false, activeFilter = "All") => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (force) params.set("force", "true");
        if (activeFilter && activeFilter !== "All")
          params.set("filter", activeFilter);
        const qs = params.toString();
        const url = `${API_URL}/api/trends${qs ? `?${qs}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const newTweets = data.tweets || [];
        // Only replace if we got results; keep old ones otherwise
        if (newTweets.length > 0) setTweets(newTweets);
        setFetchedAt(Date.now());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(false, "All");
  }, [fetchData]);

  // Update "minutes ago" every 30 seconds
  useEffect(() => {
    if (!fetchedAt) return;
    const update = () =>
      setMinutesAgo(Math.round((Date.now() - fetchedAt) / 60000));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  const handleCopy = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  // When filter is active, backend already filters — show tweets directly
  // When "All", backend returns all — show all
  const displayTweets =
    filter === "All"
      ? tweets
      : tweets.filter((t) => t.hook_patterns.includes(filter));

  // First load = no tweets yet, show skeletons
  // Subsequent refreshes = have tweets, show them with a subtle loading bar
  const isFirstLoad = loading && tweets.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <CopiedToast visible={toastVisible} />

      {/* Loading bar at top during refresh */}
      {loading && !isFirstLoad && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#0a0a0a]">
          <div className="h-full bg-[#3b82f6] animate-pulse" style={{ width: "100%" }} />
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#1a1a1a] py-6">
        <div className="max-w-[700px] mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">TrendPulse</h1>
              <p className="text-gray-500 text-sm mt-1">
                Trending Content Patterns — Product Building · AI Tools · UX
              </p>
            </div>
            <div className="flex items-center gap-3">
              {fetchedAt && (
                <span className="text-gray-600 text-xs">
                  Updated{" "}
                  {minutesAgo === 0 ? "just now" : `${minutesAgo}m ago`}
                </span>
              )}
              <button
                onClick={() => fetchData(true, filter)}
                disabled={loading}
                className="bg-[#3b82f6] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="border-b border-[#1a1a1a] py-3 overflow-x-auto">
        <div className="max-w-[700px] mx-auto px-4 flex gap-2 flex-nowrap">
          {ALL_PATTERNS.map((pattern) => (
            <button
              key={pattern}
              onClick={() => setFilter(pattern)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                filter === pattern
                  ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                  : "bg-transparent text-gray-400 border-[#333] hover:border-gray-500"
              }`}
            >
              {pattern}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[700px] mx-auto px-4 py-6">
        {isFirstLoad &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && !loading && tweets.length === 0 && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-2">Failed to load data</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchData(true, filter)}
              className="bg-[#3b82f6] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#2563eb]"
            >
              Retry
            </button>
          </div>
        )}

        {!isFirstLoad && displayTweets.length === 0 && !loading && (
          <p className="text-center text-gray-600 py-20">
            No tweets found for this filter.
          </p>
        )}

        {!isFirstLoad &&
          displayTweets.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} onCopy={handleCopy} />
          ))}
      </main>
    </div>
  );
}

export default App;
