export function requestLogger(req, _res, next) {
    const start = Date.now();
    const requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
    req.requestId = requestId;
    _res.on("finish", () => {
        console.log(JSON.stringify({
            t: new Date().toISOString(),
            requestId,
            method: req.method,
            path: req.path,
            status: _res.statusCode,
            durationMs: Date.now() - start,
        }));
    });
    next();
}
