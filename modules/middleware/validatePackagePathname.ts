import { RequestHandler, NextFunction, Request, Response } from "express";

import { PackageRequestType } from "../types";

const packagePathnameFormat = /^\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/;

const parsePackagePathname = (pathname: string): PackageRequestType | null => {
    try {
        pathname = decodeURIComponent(pathname);
    } catch (error) {
        return null;
    }

    const match = packagePathnameFormat.exec(pathname);

    // Disallow invalid pathnames.
    if (match == null) return null;

    const name = match[1];
    const version = match[2] || "latest";
    const filename = (match[3] || "").replace(/\/\/+/g, "/");

    return {
        // If the pathname is /@scope/name@version/file.js:
        name, // @scope/name
        version, // version
        spec: `${name}@${version}`, // @scope/name@version
        filename, // /file.js
        config: null,
    };
};

/**
 * Parse the pathname in the URL. Reject invalid URLs.
 */
const validatePackagePathname: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void | Response => {
    const parsed = parsePackagePathname(req.path);

    if (parsed == null) {
        return res.status(403).send({ error: `Invalid URL: ${req.path}` });
    }

    res.locals.package = parsed;

    next();
};

export default validatePackagePathname;
