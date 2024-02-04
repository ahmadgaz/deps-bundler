const createPackageURL = (
    packageName: string,
    packageVersion: string,
    filename: string
) => {
    let url = `/${packageName}`;

    if (packageVersion) url += `@${packageVersion}`;
    if (filename) url += filename;

    return url;
};

export default createPackageURL;
