import { RequestHandler, NextFunction, Request, Response } from "express";
import validateNpmPackageName from "validate-npm-package-name";

import { PackageRequestType } from "modules/types";

const hexValue = /^[a-f0-9]+$/i;

const isHash = (value: string): boolean => {
    return value.length === 32 && hexValue.test(value);
};

/**
 * Reject requests for invalid npm package names.
 */
const validatePackageName: RequestHandler = (
    _req: Request,
    res: Response,
    next: NextFunction
): void | Response => {
    const info: PackageRequestType = res.locals.package;

    if (info == null) {
        return res.status(404).send({ error: "Package not found" });
    }

    if (isHash(info.name)) {
        return res
            .status(403)
            .type("text")
            .send(`Invalid package name "${info.name}" (cannot be a hash)`);
    }

    const warnings = validateNpmPackageName(info.name).warnings;

    if (warnings) {
        const reason = warnings.join(", ");

        return res
            .status(403)
            .type("text")
            .send(`Invalid package name "${info.name}" (${reason})`);
    }

    next();
};

export default validatePackageName;
