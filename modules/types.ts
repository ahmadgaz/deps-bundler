export type Options = {
    algorithms?: string[];
    delimiter?: string;
    full?: boolean;
};

export type Integrity = string | undefined;

export type SRIType =
    | {
          hashes: Record<string, string>;
          integrity: Integrity;
      }
    | Integrity;

export type PackageConfigMetadataType = Record<string, unknown>;

export type PackageNPMVersionMetadataType = {
    versions: { [key: string]: PackageConfigMetadataType };
    "dist-tags": { [key: string]: string };
};

export type PackageVersionMetadataType = {
    versions: string[];
    tags: { [key: string]: string };
};

export type LogType = {
    debug: (format: string, ...args: string[]) => void | (() => void);
    info: (format: string, ...args: string[]) => void;
    error: (format: string, ...args: string[]) => void;
};

export type PackageRequestType = {
    /**
     * The package name, as given in the URL.
     * @example "@scope/name"
     * @example "name"
     */
    name: string;
    /**
     * The package version, as given in the URL.
     * @example "1.2.3"
     * @example "latest"
     * @example "next"
     */
    version: string;
    /**
     * The package spec, as derived from the name and version.
     * @example "@scope/name@1.2.3"
     * @example "name@latest"
     */
    spec: string;
    /**
     * The package filename, as given in the URL.
     * @example "/file.js"
     * @example "/directory/"
     */
    filename: string;
    /**
     * The package configuration, as fetched from the package.
     */
    config: PackageConfigMetadataType | null;
};

export type Entry = {
    path?: string;
    name?: string;
    contentType?: string;
    integrity?: SRIType;
    lastModified?: string;
    size?: number;
    content?: Buffer;
    type:
        | "directory"
        | "file"
        | "link"
        | "symlink"
        | "character-device"
        | "block-device"
        | "fifo"
        | "contiguous-file"
        | "pax-header"
        | "pax-global-header"
        | "gnu-long-link-path"
        | "gnu-long-path"
        | null
        | undefined;
};
