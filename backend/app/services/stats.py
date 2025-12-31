import json
import os
from datetime import datetime

STATS_FILE = "stats.json"

class StatsService:
    def __init__(self):
        self.stats = self._load_stats()

    def _load_stats(self):
        if os.path.exists(STATS_FILE):
             try:
                 with open(STATS_FILE, "r") as f:
                     return json.load(f)
             except:
                 pass
        return {
            "total_tokens": 0,
            "total_duration_seconds": 0,
            "total_interactions": 0,
            "sessions": []
        }

    def _save_stats(self):
        with open(STATS_FILE, "w") as f:
            json.dump(self.stats, f, indent=4)

    def record_usage(self, tokens: int, duration_sec: float):
        self.stats["total_tokens"] += tokens
        self.stats["total_duration_seconds"] += duration_sec
        self.stats["total_interactions"] += 1
        
        # Keep last 50 session logs for analytics graph
        session_entry = {
            "timestamp": datetime.now().isoformat(),
            "tokens": tokens,
            "duration": duration_sec
        }
        self.stats["sessions"].append(session_entry)
        if len(self.stats["sessions"]) > 50:
            self.stats["sessions"].pop(0)

        self._save_stats()

    def get_stats(self):
        return {
            "total_tokens": self.stats["total_tokens"],
            "total_hours": round(self.stats["total_duration_seconds"] / 3600, 2),
            "interactions": self.stats["total_interactions"],
            "usage_percent": min(100, int((self.stats["total_duration_seconds"] / (3600 * 50)) * 100)), # Assumes 50hr limit for progress bar
            "recent_sessions": self.stats["sessions"]
        }
