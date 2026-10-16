#!/usr/bin/env python3
"""
Local HTTP Server for Aerospace Cybersecurity Workshop Portal
Supports proper ES Module MIME types and auto-fallback ports.
"""
import http.server
import socketserver
import os
import sys

DEFAULT_PORT = 8080
PORTS_TO_TRY = [8080, 8081, 8082, 8000, 3000, 8888]

class AerospaceHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable cache during development/workshop
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure proper MIME type for JavaScript ES modules
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.mjs'):
            return 'application/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.html'):
            return 'text/html'
        return super().guess_type(path)

def run():
    # Change working directory to directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    server = None
    selected_port = None

    for port in PORTS_TO_TRY:
        try:
            # Allow address reuse
            socketserver.TCPServer.allow_reuse_address = True
            server = socketserver.TCPServer(("", port), AerospaceHTTPRequestHandler)
            selected_port = port
            break
        except OSError:
            continue

    if not server:
        print("ERROR: Could not bind to any test ports.")
        sys.exit(1)

    print(f"================================================================")
    print(f"🛰️  AEROSPACE CYBERSECURITY WORKSHOP PORTAL DEPLOYED LOCALLY")
    print(f"================================================================")
    print(f"Local URL: http://localhost:{selected_port}")
    print(f"Local Network: http://127.0.0.1:{selected_port}")
    print(f"Serving files from: {script_dir}")
    print(f"================================================================")
    sys.stdout.flush()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == '__main__':
    run()
