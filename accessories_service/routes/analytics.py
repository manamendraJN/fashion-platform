from flask import Blueprint, request, jsonify
from database import get_db

analytics_bp = Blueprint("analytics_bp", __name__)


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    with get_db() as conn:
        total      = conn.execute("SELECT COUNT(*) FROM wardrobe").fetchone()[0]
        available  = conn.execute("SELECT COUNT(*) FROM wardrobe WHERE is_available=1").fetchone()[0]
        favourites = conn.execute("SELECT COUNT(*) FROM wardrobe WHERE is_favourite=1").fetchone()[0]
        categories = conn.execute("SELECT COUNT(DISTINCT category) FROM wardrobe").fetchone()[0]

        cat_dist    = conn.execute(
            "SELECT category, COUNT(*) as cnt FROM wardrobe GROUP BY category ORDER BY cnt DESC"
        ).fetchall()
        color_dist  = conn.execute(
            "SELECT color, COUNT(*) as cnt FROM wardrobe GROUP BY color ORDER BY cnt DESC LIMIT 10"
        ).fetchall()
        usage_dist  = conn.execute(
            "SELECT usage, COUNT(*) as cnt FROM wardrobe GROUP BY usage ORDER BY cnt DESC"
        ).fetchall()
        season_dist = conn.execute(
            "SELECT season, COUNT(*) as cnt FROM wardrobe GROUP BY season ORDER BY cnt DESC"
        ).fetchall()
        most_used   = conn.execute(
            "SELECT id, name, category, usage_count FROM wardrobe ORDER BY usage_count DESC LIMIT 5"
        ).fetchall()
        least_used  = conn.execute(
            "SELECT id, name, category, usage_count FROM wardrobe WHERE usage_count >= 0 ORDER BY usage_count ASC LIMIT 5"
        ).fetchall()
        recent_activity = conn.execute(
            "SELECT action, description, created_at FROM activity_log ORDER BY id DESC LIMIT 10"
        ).fetchall()

    return jsonify({
        "summary": {
            "total": total, "available": available,
            "unavailable": total - available, "favourites": favourites, "categories": categories,
        },
        "category_distribution": [dict(r) for r in cat_dist],
        "color_distribution":    [dict(r) for r in color_dist],
        "usage_distribution":    [dict(r) for r in usage_dist],
        "season_distribution":   [dict(r) for r in season_dist],
        "most_used":             [dict(r) for r in most_used],
        "least_used":            [dict(r) for r in least_used],
        "recent_activity":       [dict(r) for r in recent_activity],
    })


@analytics_bp.route("/activity", methods=["GET"])
def get_activity():
    limit = int(request.args.get("limit", 20))
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])
