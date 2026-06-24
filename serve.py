#!/usr/bin/env python3
"""Start local server and sync js/env.js from .env before serving."""
import subprocess
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


def generate_env() -> None:
    script = ROOT / "scripts" / "generate-env.py"
    subprocess.run([sys.executable, str(script)], cwd=str(ROOT), check=False)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/dashboard", "/dashboard/"):
            self.send_response(301)
            self.send_header("Location", "/dashboard.html")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path == "/" or path.endswith(".html"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    generate_env()
    server = HTTPServer(("", PORT), Handler)
    print(f"Serving at http://localhost:{PORT}")
    print("Dashboard: http://localhost:{0}/dashboard.html".format(PORT))
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
