import uuid
from flask import Blueprint, request, jsonify
from database import get_db, row_to_dict

wardrobe_bp = Blueprint("wardrobe_bp", __name__)


@wardrobe_bp.route("/wardrobe", methods=["GET"])
def get_wardrobe():
    category = request.args.get("category", "")
    gender   = request.args.get("gender",   "")
    search   = request.args.get("search",   "").lower()
    fav_only = request.args.get("favourites", "false").lower() == "true"

    sql    = "SELECT * FROM wardrobe WHERE 1=1"
    params = []
    if category:
        sql += " AND category = ?";   params.append(category)
    if gender:
        sql += " AND gender = ?";     params.append(gender)
    if search:
        sql += " AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)";
        params += [f"%{search}%", f"%{search}%"]
    if fav_only:
        sql += " AND is_favourite = 1"
    sql += " ORDER BY added_date DESC"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@wardrobe_bp.route("/wardrobe", methods=["POST"])
def add_wardrobe_item():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    item_id = data.get("id") or str(uuid.uuid4())
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO wardrobe
              (id, name, category, color, gender, usage, season,
               brand, size, price, image, is_favourite, is_available,
               usage_count, added_date)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            item_id,
            data.get("name", ""),
            data.get("category", ""),
            data.get("color", ""),
            data.get("gender", ""),
            data.get("usage", ""),
            data.get("season", ""),
            data.get("brand", ""),
            data.get("size", ""),
            float(data.get("price", 0)),
            data.get("image", ""),
            1 if data.get("isFavourite") else 0,
            1 if data.get("isAvailable", True) else 0,
            int(data.get("usage_count", 0)),
            data.get("addedDate") or "now",
        ))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("ADD", f"Added '{data.get('name')}' to wardrobe", item_id),
        )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@wardrobe_bp.route("/wardrobe/<item_id>", methods=["GET"])
def get_wardrobe_item(item_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(row_to_dict(row))


@wardrobe_bp.route("/wardrobe/<item_id>", methods=["PUT"])
def update_wardrobe_item(item_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    with get_db() as conn:
        existing = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if existing is None:
            return jsonify({"error": "Item not found"}), 404

        fields, params = [], []
        allowed = ["name", "category", "color", "gender", "usage", "season",
                   "brand", "size", "price", "image", "usage_count"]
        for f in allowed:
            if f in data:
                fields.append(f"{f}=?")
                params.append(data[f])
        if "isFavourite" in data:
            fields.append("is_favourite=?")
            params.append(1 if data["isFavourite"] else 0)
        if "isAvailable" in data:
            fields.append("is_available=?")
            params.append(1 if data["isAvailable"] else 0)

        if fields:
            fields.append("updated_at=datetime('now')")
            params.append(item_id)
            conn.execute(f"UPDATE wardrobe SET {', '.join(fields)} WHERE id=?", params)
            conn.execute(
                "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
                ("UPDATE", f"Updated '{existing['name']}'", item_id),
            )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(row))


@wardrobe_bp.route("/wardrobe/<item_id>", methods=["DELETE"])
def delete_wardrobe_item(item_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        conn.execute("DELETE FROM wardrobe WHERE id=?", (item_id,))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("DELETE", f"Removed '{row['name']}' from wardrobe", item_id),
        )
    return jsonify({"deleted": item_id})


@wardrobe_bp.route("/wardrobe/<item_id>/favourite", methods=["PATCH"])
def toggle_favourite(item_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        new_val = 0 if row["is_favourite"] else 1
        conn.execute(
            "UPDATE wardrobe SET is_favourite=?, updated_at=datetime('now') WHERE id=?",
            (new_val, item_id),
        )
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("FAVOURITE" if new_val else "UNFAVOURITE",
             f"{'Saved' if new_val else 'Removed'} '{row['name']}' {'to' if new_val else 'from'} favourites",
             item_id),
        )
        updated = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@wardrobe_bp.route("/wardrobe/<item_id>/availability", methods=["PATCH"])
def toggle_availability(item_id):
    data = request.get_json() or {}
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        if "isAvailable" in data:
            new_val = 1 if data["isAvailable"] else 0
        else:
            new_val = 0 if row["is_available"] else 1
        conn.execute(
            "UPDATE wardrobe SET is_available=?, updated_at=datetime('now') WHERE id=?",
            (new_val, item_id),
        )
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("AVAILABLE" if new_val else "UNAVAILABLE",
             f"Marked '{row['name']}' as {'available' if new_val else 'unavailable'}", item_id),
        )
        updated = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@wardrobe_bp.route("/wardrobe/<item_id>/use", methods=["PATCH"])
def increment_usage(item_id):
    with get_db() as conn:
        conn.execute("""
            UPDATE wardrobe
            SET usage_count    = usage_count + 1,
                last_used_date = date('now'),
                updated_at     = datetime('now')
            WHERE id = ?
        """, (item_id,))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("USE", "Accessory used", item_id),
        )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(row_to_dict(row))
