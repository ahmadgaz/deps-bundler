import { RequestHandler, NextFunction, Request, Response } from "express";
import semver from "semver";

import { getVersionsAndTags, getPackageConfig } from "modules/utils/npm";
import { LogType, PackageRequestType } from "modules/types";
import asyncHandler from "modules/utils/asyncHandler";

const createPackageURL = (
    packageName: string,
    packageVersion: string,
    filename: string
): string => {
    let url = `/${packageName}`;

    if (packageVersion) url += `@${packageVersion}`;
    if (filename) url += filename;
    // NO QUERIES ALLOWED

    return url;
};

const semverRedirect = (
    req: Request,
    res: Response,
    info: PackageRequestType,
    newVersion: string
): void => {
    res.set({
        "Cache-Control": "public, s-maxage=600, max-age=60", // 10 mins on CDN, 1 min on clients
        "Cache-Tag": "redirect, semver-redirect",
    }).redirect(
        302,
        req.baseUrl + createPackageURL(info.name, newVersion, info.filename)
    );
};

const resolveVersion = async (
    packageName: string,
    range: string,
    log: LogType
): Promise<string | null> => {
    const versionsAndTags = await getVersionsAndTags(packageName, log);

    if (versionsAndTags) {
        const { versions, tags } = versionsAndTags;

        if (range in tags) {
            range = tags[range];
        }
        return versions.includes(range)
            ? range
            : semver.maxSatisfying(versions, range);
    }

    return null;
};

/**
 * Check the package version/tag in the URL and make sure it's good. Also
 * fetch the package config and add it to req.package.config. Redirect to
 * the resolved version number if necessary.
 */
const validatePackageVersion: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    const info: PackageRequestType = res.locals.package;
    const log: LogType = res.locals.log;

    const version = await resolveVersion(info.name, info.version, log);

    if (!version) {
        return res
            .status(404)
            .type("text")
            .send(`Cannot find package ${info.spec}`);
    }

    if (version !== info.version) {
        return semverRedirect(req, res, info, version);
    }

    info.config = await getPackageConfig(info.name, info.version, log);

    if (!info.config) {
        return res
            .status(500)
            .type("text")
            .send(`Cannot get config for package ${info.spec}`);
    }

    next();
};

export default asyncHandler(validatePackageVersion);
