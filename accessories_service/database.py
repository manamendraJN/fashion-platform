import sqlite3
from contextlib import contextmanager
from config import DB_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS wardrobe (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category    TEXT,
                color       TEXT,
                gender      TEXT,
                usage       TEXT,
                season      TEXT,
                brand       TEXT,
                size        TEXT,
                price       REAL DEFAULT 0,
                image       TEXT,
                is_favourite INTEGER DEFAULT 0,
                is_available INTEGER DEFAULT 1,
                usage_count INTEGER DEFAULT 0,
                last_used_date TEXT DEFAULT NULL,
                added_date  TEXT DEFAULT (date('now')),
                updated_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS saved_looks (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                occasion        TEXT,
                gender          TEXT,
                dress_image     TEXT,
                accessory_ids   TEXT,
                accessory_data  TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                action      TEXT NOT NULL,
                description TEXT,
                item_id     TEXT,
                created_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS recommendation_log (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                occasion        TEXT,
                gender          TEXT,
                religion        TEXT,
                budget          REAL,
                recommended_ids TEXT,
                selected_id     TEXT,
                accepted        INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );
        """)
    print("✅ SQLite database initialised:", DB_PATH)


def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    d["isFavourite"] = bool(d.pop("is_favourite", 0))
    d["isAvailable"] = bool(d.pop("is_available", 1))
    d.setdefault("last_used_date", None)
    return d
