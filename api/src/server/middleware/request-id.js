let idCounter = 0;
export function generateRequestId() {
    idCounter++;
    return `req_${Date.now().toString(36)}_${idCounter}`;
}
export function requestIdMiddleware(req, _res, next) {
    req.requestId = generateRequestId();
    next();
}
//# sourceMappingURL=request-id.js.map