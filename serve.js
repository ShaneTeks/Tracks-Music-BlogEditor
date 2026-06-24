const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4174);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, headers);
  response.end(body);
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    send(response, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      send(response, 404, 'Not found');
      return;
    }

    send(response, 200, contents, {
      'Cache-Control': 'no-store',
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tracks Blog Editor running at http://localhost:${port}`);
});
