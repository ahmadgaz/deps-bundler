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
    name: string;
    version: string;
    spec: string;
    filename: string;
    config: PackageConfigMetadataType | null;
};
