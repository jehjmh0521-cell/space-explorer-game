const http=require('node:http'),fs=require('node:fs');
const page=fs.readFileSync('index.html');
http.createServer((req,res)=>{if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(page);}else{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1');
