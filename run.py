import SimpleHTTPServer
import SocketServer
import webbrowser

PORT = 8000

Handler = SimpleHTTPServer.SimpleHTTPRequestHandler

httpd = SocketServer.TCPServer(("", PORT), Handler)

print "Serving Carthagogram via SimpleHttpServer at port", PORT
webbrowser.open("http://localhost:8000/src/")
httpd.serve_forever()