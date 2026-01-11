const API_PATHS = [
    "/api/",
    "/open_api/",
    "/user_api/",
    "/admin/",
    "/telegram/",
    "/external/",
];

export async function onRequest(context) {
    const reqPath = new URL(context.request.url).pathname;
    if (API_PATHS.map(path => reqPath.startsWith(path)).some(Boolean)) {
        return context.env.BACKEND.fetch(context.request);
    }
    const response = await context.next();
    if (response.status === 404) {
        const accept = context.request.headers.get("accept") || "";
        if (accept.includes("text/html")) {
            const url = new URL(context.request.url);
            url.pathname = "/index.html";
            return fetch(url.toString(), context.request);
        }
    }
    return response;
}
