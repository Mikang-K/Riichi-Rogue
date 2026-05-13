import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const requestPath = decodeURIComponent(url.pathname);
  const safePath = normalize(requestPath).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath === "" ? "index.html" : safePath);

  try {
    const data = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] ?? "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Tile Burst is running at http://localhost:${port}`);
});
