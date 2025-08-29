const http = require("http");
const url = require("url");


// Simulate API calls - DO NOT MODIFY
const callModel = async (modelName, delay, successRate) => {
    await new Promise(r => setTimeout(r, delay));
    if (Math.random() > successRate) throw new Error(`${modelName} failed`);
    return {
        model: modelName,
        confidence: 0.5 + Math.random() * 0.5,
        result: Math.random() > 0.5 ? 'Human' : 'AI'
    };
};
const modelA = () => callModel('ModelA', 1000, 0.9);
const modelB = () => callModel('ModelB', 2000, 0.7);
const modelC = () => callModel('ModelC', 3000, 0.95);

// config
const PORT = 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // (time to live) thời gian cache sống (5 phút) trước khi gọi lại model
const questions = [
  "Tell me about yourself",
  "Why this company?",
  "Greatest weakness?",
  "Describe a challenge you solved",
  "Where do you see yourself in 5 years?",
];

// logging in console 
// event: server_listern, shutdown, cache_hit, model_try, model_fail, detect_ok, detect_error
function log(event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.log(JSON.stringify(entry));
}

// cache
const cache = new Map(); // key: question, value: { at: number, data: object }
function getFromCache(question) {
  const hit = cache.get(question);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(question);
    return null;
  }
  return hit.data;
}
function setCache(question, data) {
  cache.set(question, { at: Date.now(), data });
}

// dependency injection: tiêm list model bên ngoài vào class
function createDetector(models) {
  const { modelA, modelB, modelC } = models;

  return async function detectAnswer(question, opts = { useCache: true }) {
    const start = Date.now();

    // get cache
    if (opts.useCache) {
      const cached = getFromCache(question);
      if (cached) {
        const fromCache = { ...cached, timeTaken: 0, cached: true };
        log("cache_hit", { question, model: cached.model });
        return fromCache;
      }
    }

    // fallback
    let data;
    try {
      log("model_try", { question, model: "ModelA" });
      data = await modelA();
    } catch (errA) {
      log("model_fail", { question, model: "ModelA", error: errA.message });
      try {
        log("model_try", { question, model: "ModelB" });
        data = await modelB();
      } catch (errB) {
        log("model_fail", { question, model: "ModelB", error: errB.message });
        try {
          log("model_try", { question, model: "ModelC" });
          data = await modelC();
        } catch (errC) {
          log("model_fail", { question, model: "ModelC", error: errC.message });
          const total = Date.now() - start;
          log("detect_error", { question, timeTaken: total });
          throw new Error("All models failed");
        }
      }
    }

    const result = {
      question,
      ...data,
      timeTaken: Date.now() - start,
      cached: false,
    };

    // set cache
    if (opts.useCache) {
      setCache(question, { ...result, cached: false }); // store last result
    }

    log("detect_ok", { question, model: result.model, timeTaken: result.timeTaken });
    return result;
  };
}

// detector object
const detectAnswer = createDetector({ modelA, modelB, modelC });

// http server
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);   //eg: results and {question: "...", nocache: "1"}

  // path /: "hello"
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("hello");
  }

  // path /results
  if (pathname === "/results") {
    try {
      const nocache = query.nocache === "1";
      // 1 unknown specific question
      if (query.question) {
        const result = await detectAnswer(query.question, { useCache: !nocache });
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify([result]));
      }

      // 5 predefined question: run parallel with Promise.all
      const results = await Promise.all(
        questions.map((q) => detectAnswer(q, { useCache: !nocache }))
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(results));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // path /health
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", time: new Date().toISOString() }));
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

// shutdown
function shutdown(signal) {
  log("shutdown", { signal });
  server.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));




// prevent port conflict - only init server when running this file
if (require.main === module) {
  server.listen(PORT, () => {
    log("server_listen", { port: PORT });
    console.log(`Server running at http://localhost:${PORT} (/, /results, /health)`);
  });
}

// export for unit test
module.exports = {
  createDetector,
};
