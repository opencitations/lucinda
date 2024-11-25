import http.server
import socketserver
import requests
from urllib.parse import urlparse, parse_qs

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Check if the path is the one you want to proxy
        if self.path.startswith("/proxy"):
            query = self.path[7:]  # Strip "/proxy" from the start of the path
            target_url = "https://opencitations.net/meta/sparql?" + query

            # Send the GET request to the target server
            response = requests.get(target_url)

            # Return the response to the client
            print(target_url);
            print(response);
            self.send_response(response.status_code)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(response.content)
        else:
            super().do_GET()  # Default behavior for other paths

# Run the server on port 8001 or another port of your choice
PORT = 8001
Handler = ProxyHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)
print(f"Serving at port {PORT}")
httpd.serve_forever()
