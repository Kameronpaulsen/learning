const http = require('http');
const pg = require('pg');

const PORT = process.env.PORT || 8080;

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const server = http.createServer(async (req, res) => {
  const {method, url} = req;

  if(method == 'GET' && url == '/pg-time'){
    try {
      const time = await getPgTime();
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({time}));
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Failed to fetch PostgreSQL time'}));
    }
    return;
  }

  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.end('Not Found\n'); 

});

async function getPgTime() {
  const result = await pgPool.query('SELECT NOW()');
  return result.rows[0].now;
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});