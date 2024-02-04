import crypto from "crypto";

import { Integrity, Options, SRIType } from "modules/types";

const defaults = (options: Options): Options => {
    return {
        algorithms: options.algorithms || ["sha256"],
        delimiter: options.delimiter || " ",
        full: options.full || false,
    };
};

const digest = (algorithm: string, data: Buffer): string => {
    return crypto
        .createHash(algorithm)
        .update(data.toString(), "utf8")
        .digest("base64");
};

const hashes = (options: Options, data: Buffer): Record<string, string> => {
    const hashes: Record<string, string> = {};
    options.algorithms?.forEach((algorithm) => {
        hashes[algorithm] = digest(algorithm, data);
    });
    return hashes;
};

const integrity = (options: Options, sri: SRIType): Integrity => {
    let output = "";

    if (typeof sri === "string" || sri === undefined) {
        return sri;
    }

    output += Object.keys(sri.hashes)
        .map((algorithm) => {
            return algorithm + "-" + sri.hashes[algorithm];
        })
        .join(options.delimiter);

    return output;
};

const generate = (options: Options, data: Buffer): SRIType => {
    // Defaults
    options = defaults(options);

    const sri: SRIType = {
        hashes: hashes(options, data),
        integrity: undefined,
    };
    sri.integrity = integrity(options, sri);

    return options.full ? sri : sri.integrity;
};

const getIntegrity = (data: Buffer) => {
    return generate({ algorithms: ["sha384"] }, data);
};

export default getIntegrity;
