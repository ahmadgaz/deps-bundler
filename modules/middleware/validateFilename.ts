import { RequestHandler, NextFunction, Request, Response } from "express";

import createPackageURL from "modules/utils/createPackageURL";

const filenameRedirect = (res: Response): void => {
    let filename: string;
    if (
        res.locals.package.config?.unpkg &&
        typeof res.locals.package.config.unpkg === "string"
    ) {
        filename = res.locals.package.config.unpkg;
    } else if (
        res.locals.package.config?.main &&
        typeof res.locals.package.config.main === "string"
    ) {
        filename = res.locals.package.config?.main;
    } else {
        filename = "/index.js";
    }

    // Redirect to the exact filename so relative imports
    // and URLs resolve correctly.
    res.set({
        "Cache-Control": "public, max-age=31536000", // 1 year
        "Cache-Tag": "redirect, filename-redirect",
    }).redirect(
        302,
        createPackageURL(
            res.locals.package.name,
            res.locals.package.version,
            filename.replace(/^[./]*/, "/")
        )
    );
};

/**
 * Redirect to the exact filename if the request omits one.
 */
const validateFilename: RequestHandler = (
    _req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!res.locals.package.filename || res.locals.package.filename === "/") {
        return filenameRedirect(res);
    }

    next();
};

export default validateFilename;
