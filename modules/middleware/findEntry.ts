import { RequestHandler, NextFunction, Request, Response } from "express";
import path from "path";
import tar from "tar-stream";

import asyncHandler from "modules/utils/asyncHandler";
import bufferStream from "modules/utils/bufferStream";
import createPackageURL from "modules/utils/createPackageURL";
import getContentType from "modules/utils/getContentType";
import getIntegrity from "modules/utils/getIntegrity";
import { getPackage } from "modules/utils/npm";
import { Transform } from "stream";
import { Entry } from "modules/types";

const fileRedirect = (
    _req: Request,
    res: Response,
    entry: Entry
): Response | void => {
    // Redirect to the file with the extension so it's
    // clear which file is being served.
    if (!entry.path) {
        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, file-redirect",
            })
            .type("text")
            .send(`Cannot find file in ${res.locals.package.spec}`);
    }

    res.set({
        "Cache-Control": "public, max-age=31536000", // 1 year
        "Cache-Tag": "redirect, file-redirect",
    }).redirect(
        302,
        createPackageURL(
            res.locals.package.name,
            res.locals.package.version,
            entry.path
        )
    );
};

const indexRedirect = (
    _req: Request,
    res: Response,
    entry: Entry
): Response | void => {
    // Redirect to the index file so relative imports
    // resolve correctly.
    if (!entry.path) {
        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, file-redirect",
            })
            .type("text")
            .send(`Cannot find file in ${res.locals.package.spec}`);
    }

    res.set({
        "Cache-Control": "public, max-age=31536000", // 1 year
        "Cache-Tag": "redirect, index-redirect",
    }).redirect(
        302,
        createPackageURL(
            res.locals.package.name,
            res.locals.package.version,
            entry.path
        )
    );
};

/**
 * Search the given tarball for entries that match the given name.
 * Follows node's resolution algorithm.
 * https://nodejs.org/api/modules.html#modules_all_together
 */
const searchEntries = (
    stream: Transform,
    filename: string
): Promise<{ foundEntry: Entry; matchingEntries: Record<string, Entry> }> => {
    // filename = /some/file/name.js or /some/dir/name
    return new Promise((accept, reject) => {
        const jsEntryFilename = `${filename}.js`;
        const jsonEntryFilename = `${filename}.json`;

        const matchingEntries: Record<string, Entry> = {};
        let foundEntry: Entry;

        // Analyze package.json
        //      Recursively resolve dependencies (get tgz) and add them all to a node_modules folder.
        //      Check all entry points for the package against the import statement. These are main, module, exports, browser + submodule details or plugins.
        //

        // Build file tree first

        // Bundle foundEntry into a single entry

        stream
            .pipe(tar.extract())
            .on("error", reject)
            .on("entry", async (header, stream, next) => {
                const entry: Entry = {
                    // Most packages have header names that look like `package/index.js`
                    // so we shorten that to just `index.js` here. A few packages use a
                    // prefix other than `package/`. e.g. the firebase package uses the
                    // `firebase_npm/` prefix. So we just strip the first dir name.
                    path: header.name.replace(/^[^/]+/g, ""),
                    type: header.type,
                };

                // Skip non-files and files that don't match the entryName.
                if (
                    entry.type !== "file" ||
                    !entry.path?.startsWith(filename)
                ) {
                    stream.resume();
                    stream.on("end", next);
                    return;
                }

                matchingEntries[entry.path] = entry;

                // Dynamically create "directory" entries for all directories
                // that are in this file's path. Some tarballs omit these entries
                // for some reason, so this is the "brute force" method.
                let dir = path.dirname(entry.path);
                while (dir !== "/") {
                    if (!matchingEntries[dir]) {
                        matchingEntries[dir] = { name: dir, type: "directory" };
                    }
                    dir = path.dirname(dir);
                }

                if (
                    entry.path === filename ||
                    // Allow accessing e.g. `/index.js` or `/index.json`
                    // using `/index` for compatibility with npm
                    entry.path === jsEntryFilename ||
                    entry.path === jsonEntryFilename
                ) {
                    if (foundEntry) {
                        if (
                            foundEntry.path !== filename &&
                            (entry.path === filename ||
                                (entry.path === jsEntryFilename &&
                                    foundEntry.path === jsonEntryFilename))
                        ) {
                            // This entry is higher priority than the one
                            // we already found. Replace it.
                            delete foundEntry.content;
                            foundEntry = entry;
                        }
                    } else {
                        foundEntry = entry;
                    }
                }

                try {
                    const content = await bufferStream(stream);

                    entry.contentType = getContentType(entry.path);
                    entry.integrity = getIntegrity(content);
                    entry.lastModified = header.mtime?.toUTCString();
                    entry.size = content.length;

                    // Set the content only for the foundEntry and
                    // discard the buffer for all others.
                    if (entry === foundEntry) {
                        entry.content = content;
                    }

                    next();
                } catch (error) {
                    next(error);
                }
            })
            .on("finish", () => {
                accept({
                    // If we didn't find a matching file entry,
                    // try a directory entry with the same name.
                    foundEntry: foundEntry || matchingEntries[filename] || null,
                    matchingEntries: matchingEntries,
                });
            });
    });
};

/**
 * Fetch and search the archive to try and find the requested file.
 * Redirect to the "index" file if a directory was requested.
 */
const findEntry: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    const stream = await getPackage(
        res.locals.package.name,
        res.locals.package.version,
        res.locals.log
    );

    if (stream == null) {
        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, missing-package",
            })
            .type("text")
            .send(`Cannot find package ${res.locals.package.spec}`);
    }

    const { foundEntry: entry, matchingEntries: entries } = await searchEntries(
        stream,
        res.locals.package.filename
    );

    if (!entry) {
        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, missing-entry",
            })
            .type("text")
            .send(
                `Cannot find "${res.locals.package.filename}" in ${res.locals.package.spec}`
            );
    }

    if (entry.type === "file" && entry.path !== res.locals.package.filename) {
        return fileRedirect(req, res, entry);
    }

    if (entry.type === "directory") {
        // We need to redirect to some "index" file inside the directory so
        // our URLs work in a similar way to require("lib") in node where it
        // uses `lib/index.js` when `lib` is a directory.
        const indexEntry =
            entries[`${res.locals.package.filename}/index.js`] ||
            entries[`${res.locals.package.filename}/index.json`];

        if (indexEntry && indexEntry.type === "file") {
            return indexRedirect(req, res, indexEntry);
        }

        return res
            .status(404)
            .set({
                "Cache-Control": "public, max-age=31536000", // 1 year
                "Cache-Tag": "missing, missing-index",
            })
            .type("text")
            .send(
                `Cannot find an index in "${res.locals.package.filename}" in ${res.locals.package.spec}`
            );
    }

    res.locals.entry = entry;

    next();
};

export default asyncHandler(findEntry);
