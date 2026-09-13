const http = require("http");
http.createServer((req, res) => {
  require("../backend/utils/static")(req, res, __dirname);
}).listen(3000, () => console.log("App http://localhost:3000"));
