import json
import uuid
from flask import Blueprint, request, jsonify
from database import get_db

looks_bp = Blueprint("looks_bp", __name__)


@looks_bp.route("/looks", methods=["GET"])
def get_looks():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_looks ORDER BY created_at DESC"
        ).fetchall()
    looks = []
    for row in rows:
        d = dict(row)
        try:
            d["accessory_ids"]  = json.loads(d.get("accessory_ids",  "[]") or "[]")
            d["accessory_data"] = json.loads(d.get("accessory_data", "[]") or "[]")
        except Exception:
            d["accessory_ids"]  = []
            d["accessory_data"] = []
        looks.append(d)
    return jsonify(looks)


@looks_bp.route("/looks", methods=["POST"])
def save_look():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON required"}), 400

    look_id        = str(uuid.uuid4())
    accessory_ids  = data.get("accessory_ids",  [])
    accessory_data = data.get("accessory_data", [])

    with get_db() as conn:
        conn.execute("""
            INSERT INTO saved_looks (id, name, occasion, gender, dress_image, accessory_ids, accessory_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            look_id,
            data.get("name", f"Look {look_id[:6]}"),
            data.get("occasion", ""),
            data.get("gender", ""),
            data.get("dress_image", ""),
            json.dumps(accessory_ids),
            json.dumps(accessory_data),
        ))
        for acc_id in accessory_ids:
            conn.execute("""
                UPDATE wardrobe
                SET usage_count    = usage_count + 1,
                    last_used_date = date('now'),
                    updated_at     = datetime('now')
                WHERE id = ?
            """, (str(acc_id),))
        conn.execute(
            "INSERT INTO activity_log (action, description) VALUES (?,?)",
            ("SAVE_LOOK", f"Saved look: {data.get('name', look_id[:6])}"),
        )
        row = conn.execute("SELECT * FROM saved_looks WHERE id=?", (look_id,)).fetchone()

    d = dict(row)
    try:
        d["accessory_ids"]  = json.loads(d.get("accessory_ids",  "[]") or "[]")
        d["accessory_data"] = json.loads(d.get("accessory_data", "[]") or "[]")
    except Exception:
        pass
    return jsonify(d), 201


@looks_bp.route("/looks/<look_id>", methods=["DELETE"])
def delete_look(look_id):
    with get_db() as conn:
        conn.execute("DELETE FROM saved_looks WHERE id=?", (look_id,))
    return jsonify({"deleted": look_id})
