const http = require("http");
http.createServer((req, res) => {
  require("../backend/utils/static")(req, res, __dirname);
}).listen(3001, () => console.log("Admin http://localhost:3001"));
