#!/usr/bin/env python3
"""
Knowledge Base API Bridge — 轻量 HTTP 服务，封装 PRD 知识库工具。
供前端 Web 应用通过 REST API 调用知识库检索能力。

零外部依赖（仅 Python 标准库 + 已有脚本）。

启动：
  DASHSCOPE_API_KEY=sk-xxx python3 kb-api-server.py

端口：默认 8765
"""

import json
import os
import sys
import subprocess
import re
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("KB_API_PORT", "8765"))

# Paths
SKILL_DIR = Path(os.path.expanduser("~/.qoderwork/skills/prd-writer"))
SCRIPTS_DIR = SKILL_DIR / "scripts"
DATA_DIR = SKILL_DIR / "data"
RAW_DOCS_DIR = DATA_DIR / "raw_docs"
CHROMA_DB_DIR = DATA_DIR / "chroma_db"
TEMPLATES_DIR = DATA_DIR / "templates"
KB_STATE_FILE = DATA_DIR / "kb_state.json"


def log(msg: str):
    print(f"[kb-api] {msg}", flush=True)


def run_script(script: str, args: list, timeout: int = 120) -> str:
    """Run a skill script, return stdout."""
    cmd = ["python3", str(SCRIPTS_DIR / script)] + args
    log(f"exec: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        if result.returncode != 0:
            log(f"stderr: {result.stderr[:500]}")
        return result.stdout
    except subprocess.TimeoutExpired:
        return json.dumps({"error": f"Timeout ({timeout}s)"})
    except Exception as e:
        return json.dumps({"error": str(e)})


# ─── Tool handlers ───────────────────────────────────────────────

def handle_query_knowledge_base(params: dict) -> dict:
    """语义检索知识库"""
    query = params.get("query", "")
    if not query:
        return {"error": "Missing 'query' parameter"}

    cmd_args = [query]
    top = params.get("top", 5)
    cmd_args += ["--top", str(top)]

    if params.get("business_domain"):
        cmd_args += ["--filter", params["business_domain"]]

    context_window = params.get("context_window", 1)
    cmd_args += ["--context-window", str(context_window)]

    if params.get("min_score"):
        cmd_args += ["--min-score", str(params["min_score"])]

    output = run_script("query_rag.py", cmd_args)
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return {"error": "Script output parse error", "raw": output[:2000]}


def handle_get_kb_stats(params: dict) -> dict:
    """获取知识库统计"""
    stats = {
        "raw_docs_count": len(list(RAW_DOCS_DIR.glob("*.md"))) if RAW_DOCS_DIR.exists() else 0,
        "templates_count": len(list(TEMPLATES_DIR.glob("*.md"))) if TEMPLATES_DIR.exists() else 0,
        "chroma_db_exists": CHROMA_DB_DIR.exists(),
    }

    # Domain distribution from frontmatter
    domain_counts = {}
    if RAW_DOCS_DIR.exists():
        for md_file in RAW_DOCS_DIR.glob("*.md"):
            try:
                with open(md_file, encoding="utf-8") as f:
                    content = f.read(500)
                match = re.search(r'business_domain:\s*"([^"]+)"', content)
                if match:
                    domain = match.group(1)
                    domain_counts[domain] = domain_counts.get(domain, 0) + 1
            except Exception:
                pass
    stats["domain_distribution"] = domain_counts

    if KB_STATE_FILE.exists():
        try:
            with open(KB_STATE_FILE) as f:
                state = json.load(f)
            stats["tracked_docs"] = len(state)
        except Exception:
            pass

    return stats


def handle_list_kb_documents(params: dict) -> dict:
    """列出知识库文档"""
    business_domain = params.get("business_domain")
    keyword = params.get("keyword", "")

    docs = []
    if not RAW_DOCS_DIR.exists():
        return {"documents": [], "total": 0}

    for md_file in sorted(RAW_DOCS_DIR.glob("*.md")):
        try:
            with open(md_file, encoding="utf-8") as f:
                header = f.read(800)
            title_match = re.search(r'title:\s*"([^"]+)"', header)
            domain_match = re.search(r'business_domain:\s*"([^"]+)"', header)
            node_match = re.search(r'source_node_id:\s*"([^"]+)"', header)

            title = title_match.group(1) if title_match else md_file.stem
            domain = domain_match.group(1) if domain_match else "未标注"
            node_id = node_match.group(1) if node_match else ""

            if business_domain and business_domain not in domain:
                continue
            if keyword and keyword.lower() not in title.lower():
                continue

            docs.append({"title": title, "domain": domain, "node_id": node_id, "file": md_file.name})
        except Exception:
            pass

    return {"documents": docs[:50], "total": len(docs)}


def handle_get_prd_templates(params: dict) -> dict:
    """获取 PRD 模板"""
    template_name = params.get("template_name")

    if not TEMPLATES_DIR.exists():
        return {"error": "Templates directory not found"}

    templates = list(TEMPLATES_DIR.glob("*.md"))

    if template_name:
        for t in templates:
            if template_name in t.stem:
                with open(t, encoding="utf-8") as f:
                    content = f.read()
                return {"name": t.stem, "content": content}
        return {"error": f"Template not found: {template_name}"}

    # List all templates
    items = []
    for t in sorted(templates):
        try:
            with open(t, encoding="utf-8") as f:
                content = f.read(500)
            heading_match = re.search(r'^#\s+(.+)', content, re.MULTILINE)
            heading = heading_match.group(1) if heading_match else t.stem
            items.append({"name": t.stem, "heading": heading})
        except Exception:
            pass

    return {"templates": items, "total": len(items)}


# ─── Route table ─────────────────────────────────────────────────

ROUTES = {
    "query_knowledge_base": handle_query_knowledge_base,
    "get_kb_stats": handle_get_kb_stats,
    "list_kb_documents": handle_list_kb_documents,
    "get_prd_templates": handle_get_prd_templates,
}


# ─── HTTP Handler ────────────────────────────────────────────────

class KBHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._json_response({"status": "ok", "tools": list(ROUTES.keys())})
            return

        # Support GET with query params: /api/tool?query=xxx
        if parsed.path.startswith("/api/"):
            tool_name = parsed.path.split("/")[-1]
            if tool_name in ROUTES:
                params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
                result = ROUTES[tool_name](params)
                self._json_response(result)
                return

        self.send_error(404, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            tool_name = parsed.path.split("/")[-1]
            if tool_name in ROUTES:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
                try:
                    params = json.loads(body)
                except json.JSONDecodeError:
                    params = {}
                result = ROUTES[tool_name](params)
                self._json_response(result)
                return

        self.send_error(404, "Not found")

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        log(f"{args[0]}")


def main():
    server = HTTPServer(("0.0.0.0", PORT), KBHandler)
    log(f"KB API Bridge listening on http://localhost:{PORT}")
    log(f"Skill dir: {SKILL_DIR}")
    log(f"Tools: {', '.join(ROUTES.keys())}")
    log(f"Health: http://localhost:{PORT}/health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down")
        server.server_close()


if __name__ == "__main__":
    main()
