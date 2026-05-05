from flask import Flask, request, Response
import requests
from flask_cors import CORS

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB

# CORS - Allow frontend
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "*"]}},
     supports_credentials=True)

# ── Service registry ──
SERVICES = {
    "bodyfit":     "http://127.0.0.1:5002",  
    "wardrobe":    "http://127.0.0.1:5004",
    "accessories": "http://127.0.0.1:5001",
    "grooming":    "http://127.0.0.1:5003",
}

# ── Routes that live directly on the bodyfit service
BODYFIT_DIRECT_ROUTES = {
    "/health",
    "/model-info",
    "/predict",
    "/preview-mask",
    "/complete-analysis",
    "/switch-model",
}

# ── Accessories service routes 
ACCESSORIES_EXACT_ROUTES = {
    "/api/classify-accessory",
    "/api/extract-dress-attributes",
    "/api/fuse-features",
    "/api/recommend",
    "/api/full-pipeline",
    "/api/chat",
    "/api/explain",
    "/api/mappings",
    "/api/looks",
}


ACCESSORIES_SCOPED_PREFIX = "/api/accessories"

# ── Wardrobe service routes 
WARDROBE_FULL_PATH_PREFIXES = (
    "/api/wardrobe",        
    "/api/predict/",        
    "/api/analytics",       
    "/api/recommend-smart", 
    "/api/user-profile",    
    "/api/outfit-pairing/", 
    "/uploads/",            
)

def _proxy(target_url, method, headers, data, params, files=None):
    """Forward request and stream response back."""
    try:
        fwd_headers = {
            k: v for k, v in headers.items()
            if k.lower() not in ("host", "content-length", "transfer-encoding")
        }

        if files:
            fwd_headers.pop("content-type", None)
            fwd_headers.pop("Content-Type", None)
            resp = requests.request(
                method=method, url=target_url,
                headers=fwd_headers, files=files,
                params=params, timeout=60
            )
        else:
            resp = requests.request(
                method=method, url=target_url,
                headers=fwd_headers, data=data,
                params=params, timeout=60
            )

        excluded = {"transfer-encoding", "connection", "keep-alive",
                    "proxy-authenticate", "proxy-authorization", "te", "trailers", "upgrade"}
        resp_headers = {k: v for k, v in resp.headers.items()
                        if k.lower() not in excluded}

        return Response(resp.content, status=resp.status_code, headers=resp_headers)

    except requests.exceptions.ConnectionError:
        return {"error": f"Service unreachable at {target_url}"}, 503
    except requests.exceptions.Timeout:
        return {"error": "Service timed out"}, 504
    except Exception as e:
        return {"error": str(e)}, 500


def _collect_files():
    """Collect uploaded files from request for multipart forwarding."""
    files = {}
    for field_name, file_storage in request.files.items():
        files[field_name] = (
            file_storage.filename,
            file_storage.read(),
            file_storage.content_type or "application/octet-stream"
        )
    return files or None

# 1.  Direct bodyfit routes 
@app.route("/health", methods=["GET"])
def health():
    try:
        resp = requests.get(f"{SERVICES['bodyfit']}/health", timeout=5)
        return resp.content, resp.status_code
    except Exception:
        return {"status": "error", "message": "BodyFit service not reachable"}, 503


@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def catch_all(path):
    full_path = f"/{path}"

    # ── 1a. Direct bodyfit routes (no /api prefix) ───────────────────────────
    if full_path in BODYFIT_DIRECT_ROUTES:
        target = f"{SERVICES['bodyfit']}{full_path}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)

    # ── 1b. /api/size/...  →  bodyfit ────────────────────────────────────────
    if full_path.startswith("/api/size"):
        target = f"{SERVICES['bodyfit']}{full_path}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)

    # ── 1c. /api/admin/...  →  bodyfit ───────────────────────────────────────
    if full_path.startswith("/api/admin"):
        target = f"{SERVICES['bodyfit']}{full_path}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)

    # ── 2a. Accessories — scoped conflict routes 
    if full_path.startswith(ACCESSORIES_SCOPED_PREFIX + "/"):
        # Strip /api/accessories, keep everything after it
        rest = full_path[len(ACCESSORIES_SCOPED_PREFIX):]   # e.g. /wardrobe or /analytics/foo
        target = f"{SERVICES['accessories']}/api{rest}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)

    # ── 2b. Accessories — unique exact-prefix routes
    if any(full_path == route or full_path.startswith(route + "/")
           for route in ACCESSORIES_EXACT_ROUTES):
        target = f"{SERVICES['accessories']}{full_path}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)


    if any(full_path.startswith(prefix) for prefix in WARDROBE_FULL_PATH_PREFIXES):
        target = f"{SERVICES['wardrobe']}{full_path}"
        files = _collect_files() if request.files else None
        return _proxy(target, request.method, request.headers,
                      request.get_data(), request.args, files)

    parts = full_path.lstrip("/").split("/", 2)   # ['api', 'service', 'rest']
    if len(parts) >= 2 and parts[0] == "api":
        service = parts[1]
        rest = parts[2] if len(parts) > 2 else ""

        if service in SERVICES:
            target = f"{SERVICES[service]}/{rest}"
            files = _collect_files() if request.files else None
            return _proxy(target, request.method, request.headers,
                          request.get_data(), request.args, files)

        return {"error": f"Service '{service}' not found. "
                         f"Available: {list(SERVICES.keys())}"}, 404

    return {"error": f"Route '{full_path}' not found"}, 404


# ─────────────────────────────────────────────────────────────────────────────
# Debug endpoint
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/gateway/status", methods=["GET"])
def gateway_status():
    service_health = {}
    for name, url in SERVICES.items():
        try:
            r = requests.get(f"{url}/health", timeout=2)
            service_health[name] = {"status": "up", "code": r.status_code}
        except Exception as e:
            service_health[name] = {"status": "down", "error": str(e)}

    return {
        "gateway": "running",
        "services": service_health,
        "routing": {
            "direct_to_bodyfit": list(BODYFIT_DIRECT_ROUTES),
            "prefix_to_bodyfit": ["/api/size/...", "/api/admin/..."],
            "accessories_scoped": "/api/accessories/<wardrobe|analytics|...>  →  :5001/api/<rest>",
            "accessories_unique": list(ACCESSORIES_EXACT_ROUTES),
            "wardrobe_full_paths": list(WARDROBE_FULL_PATH_PREFIXES),
            "named_services": {k: v for k, v in SERVICES.items()}
        }
    }


if __name__ == "__main__":
    print("🚀 API Gateway running on http://localhost:5000")
    print("─" * 60)
    print("Route mapping:")
    print("  /health                        →  bodyfit      :5002")
    print("  /model-info                    →  bodyfit      :5002")
    print("  /predict                       →  bodyfit      :5002")
    print("  /preview-mask                  →  bodyfit      :5002")
    print("  /complete-analysis             →  bodyfit      :5002")
    print("  /api/size/...                  →  bodyfit      :5002")
    print("  /api/admin/...                 →  bodyfit      :5002")
    print("  ── Accessories (unique) ──────────────────────────────")
    print("  /api/classify-accessory        →  accessories  :5001")
    print("  /api/extract-dress-attributes  →  accessories  :5001")
    print("  /api/fuse-features             →  accessories  :5001")
    print("  /api/recommend                 →  accessories  :5001")
    print("  /api/full-pipeline             →  accessories  :5001")
    print("  /api/chat                      →  accessories  :5001")
    print("  /api/explain                   →  accessories  :5001")
    print("  /api/mappings                  →  accessories  :5001")
    print("  /api/looks                     →  accessories  :5001")
    print("  ── Accessories (conflict resolved via scope) ─────────")
    print("  /api/accessories/wardrobe/...  →  accessories  :5001  (/api/wardrobe/...)")
    print("  /api/accessories/analytics/... →  accessories  :5001  (/api/analytics/...)")
    print("  ── Wardrobe ─────────────────────────────────────────")
    print("  /api/wardrobe/...              →  wardrobe     :5004")
    print("  /api/analytics/...             →  wardrobe     :5004")
    print("  /api/predict/clothing-*        →  wardrobe     :5004")
    print("  /api/recommend-smart           →  wardrobe     :5004")
    print("  /api/user-profile              →  wardrobe     :5004")
    print("  /api/outfit-pairing/...        →  wardrobe     :5004")
    print("  /uploads/...                   →  wardrobe     :5004")
    print("  ── Other ────────────────────────────────────────────")
    print("  /api/grooming/...              →  grooming     :5003")
    print("  /api/gateway/status            →  gateway health check")
    print("─" * 60)
    app.run(port=5000, debug=True)