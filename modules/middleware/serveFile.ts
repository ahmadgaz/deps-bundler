import { RequestHandler, Request, Response } from "express";
import path from "path";
import etag from "etag";

import getContentTypeHeader from "modules/utils/getContentTypeHeader.js";

const serveFile: RequestHandler = (_req: Request, res: Response) => {
    const tags = ["file"];

    if (!res.locals.entry.path || !res.locals.entry.content) {
        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, file-redirect",
            })
            .type("text")
            .send(`Cannot find file in ${res.locals.package.spec}`);
    }

    const ext = path.extname(res.locals.entry.path).substring(1);
    if (ext) {
        tags.push(`${ext}-file`);
    }

    res.set({
        "Content-Type": getContentTypeHeader(
            res.locals.entry.contentType ?? "text/plain"
        ),
        "Content-Length": res.locals.entry.size,
        "Cache-Control": "public, max-age=31536000", // 1 year
        "Last-Modified": res.locals.entry.lastModified,
        ETag: etag(res.locals.entry.content),
        "Cache-Tag": tags.join(", "),
    }).send(res.locals.entry.content);
};

export default serveFile;
