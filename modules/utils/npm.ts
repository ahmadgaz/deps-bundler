import https from "https";
import http from "http";
import gunzip from "gunzip-maybe";
import { LRUCache } from "lru-cache";
import { Transform } from "stream";

import {
    LogType,
    PackageConfigMetadataType,
    PackageNPMVersionMetadataType,
    PackageVersionMetadataType,
} from "modules/types";
import bufferStream from "./bufferStream";

const NPM_REGISTRY_URL =
    process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";

const AGENT = new https.Agent({
    keepAlive: true,
});

const ONE_MEGABYTE = 1024 * 1024;
const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;

const CACHE = new LRUCache({
    maxSize: ONE_MEGABYTE * 40,
    sizeCalculation: (value: string) => Buffer.byteLength(value, "utf8"),
    ttl: ONE_SECOND,
});

const NOT_FOUND = "not-found";

const get = (options: https.RequestOptions): Promise<http.IncomingMessage> => {
    return new Promise(
        (
            accept: (res: http.IncomingMessage) => void,
            reject: (err: Error) => void
        ) => {
            https.get(options, accept).on("error", reject);
        }
    );
};

const isScopedPackageName = (packageName: string): boolean => {
    return packageName.startsWith("@");
};

const encodePackageName = (packageName: string): string => {
    return isScopedPackageName(packageName)
        ? `@${encodeURIComponent(packageName.substring(1))}`
        : encodeURIComponent(packageName);
};

const fetchPackageInfo = async <T>(
    packageName: string,
    log: LogType
): Promise<T | null> => {
    const name = encodePackageName(packageName);
    const infoURL = `${NPM_REGISTRY_URL}/${name}`;

    log.debug("Fetching package info for %s from %s", packageName, infoURL);

    const { hostname, pathname } = new URL(infoURL);
    const options: https.RequestOptions = {
        agent: AGENT,
        hostname: hostname,
        path: pathname,
        headers: {
            Accept: "application/json",
        },
    };

    const res = await get(options);

    if (res.statusCode === 200) {
        return bufferStream(res).then((value: Buffer) =>
            JSON.parse(value.toString("utf-8"))
        );
    }

    if (res.statusCode === 404) {
        return null;
    }

    const content = (await bufferStream(res)).toString("utf-8");

    log.error(
        "Error fetching info for %s (status: %s)",
        packageName,
        String(res.statusCode)
    );
    log.error(content);

    return null;
};

const fetchVersionsAndTags = async (
    packageName: string,
    log: LogType
): Promise<PackageVersionMetadataType | null> => {
    const info = await fetchPackageInfo<PackageNPMVersionMetadataType>(
        packageName,
        log
    );
    return info && info.versions
        ? { versions: Object.keys(info.versions), tags: info["dist-tags"] }
        : null;
};

/**
 * Returns an object of available { versions, tags }.
 * Uses a cache to avoid over-fetching from the registry.
 */
export const getVersionsAndTags = async (
    packageName: string,
    log: LogType
): Promise<PackageVersionMetadataType | null> => {
    const cacheKey = `versions-${packageName}`;
    const cacheValue = CACHE.get(cacheKey);
    console.log("cacheValue", cacheValue);

    if (cacheValue != undefined) {
        return cacheValue === NOT_FOUND ? null : JSON.parse(cacheValue);
    }

    const value = await fetchVersionsAndTags(packageName, log);
    console.log("value", value);

    if (value == null) {
        CACHE.set(cacheKey, NOT_FOUND, {
            ttl: 5 * ONE_MINUTE,
        });
        return null;
    }

    CACHE.set(cacheKey, JSON.stringify(value), { ttl: ONE_MINUTE });
    return value;
};

// All the keys that sometimes appear in package info
// docs that we don't need. There are probably more.
const packageConfigExcludeKeys = [
    "browserify",
    "bugs",
    "directories",
    "engines",
    "files",
    "homepage",
    "keywords",
    "maintainers",
    "scripts",
];

const cleanPackageConfig = (
    config: PackageConfigMetadataType
): PackageConfigMetadataType => {
    return Object.keys(config).reduce(
        (
            memo: PackageConfigMetadataType,
            key: string
        ): PackageConfigMetadataType => {
            if (
                !key.startsWith("_") &&
                !packageConfigExcludeKeys.includes(key)
            ) {
                memo[key] = config[key];
            }

            return memo;
        },
        {}
    );
};

const fetchPackageConfig = async (
    packageName: string,
    version: string,
    log: LogType
): Promise<PackageConfigMetadataType | null> => {
    const info = await fetchPackageInfo<PackageNPMVersionMetadataType>(
        packageName,
        log
    );
    return info && version in info.versions
        ? cleanPackageConfig(info.versions[version])
        : null;
};

/**
 * Returns metadata about a package, mostly the same as package.json.
 * Uses a cache to avoid over-fetching from the registry.
 */
export const getPackageConfig = async (
    packageName: string,
    version: string,
    log: LogType
): Promise<PackageConfigMetadataType | null> => {
    const cacheKey = `config-${packageName}-${version}`;
    const cacheValue = CACHE.get(cacheKey);

    if (cacheValue != undefined) {
        return cacheValue === NOT_FOUND ? null : JSON.parse(cacheValue);
    }

    const value = await fetchPackageConfig(packageName, version, log);

    if (value == null) {
        CACHE.set(cacheKey, NOT_FOUND, { ttl: 5 * ONE_MINUTE });
        return null;
    }

    CACHE.set(cacheKey, JSON.stringify(value), { ttl: ONE_MINUTE });
    return value;
};

/**
 * Returns a stream of the tarball'd contents of the given package.
 */
export const getPackage = async (
    packageName: string,
    version: string,
    log: LogType
): Promise<Transform | null> => {
    const tarballName = isScopedPackageName(packageName)
        ? packageName.split("/")[1]
        : packageName;
    const tarballURL = `${NPM_REGISTRY_URL}/${packageName}/-/${tarballName}-${version}.tgz`;

    log.debug("Fetching package for %s from %s", packageName, tarballURL);

    const { hostname, pathname } = new URL(tarballURL);
    const options: https.RequestOptions = {
        agent: AGENT,
        hostname: hostname,
        path: pathname,
    };

    const res = await get(options);

    if (res.statusCode === 200) {
        const stream = res.pipe(gunzip());
        return stream;
    }

    if (res.statusCode === 404) {
        return null;
    }

    const content = (await bufferStream(res)).toString("utf-8");

    log.error(
        "Error fetching tarball for %s@%s (status: %s)",
        packageName,
        version,
        String(res.statusCode)
    );
    log.error(content);

    return null;
};
