from flask import Flask, request, Response, send_from_directory

import httplib
import re
import urllib
import urlparse

app = Flask(__name__)

@app.route('/')
def index():
    #relative path will cause problems with web containers...
    return send_from_directory('static/', 'index.html')

@app.route('/proxy/<hostname>/<path:path>')
def proxy_request(hostname="localhost", path=""):
    port = 80

    app.logger.debug('Hostname:' + hostname + '/' + path)
    conn = httplib.HTTPConnection(hostname, port)
    conn.request(request.method, '/' + path)
    resp = conn.getresponse()
    
    return resp.read()

if __name__ == '__main__':
    app.run(debug=True)

