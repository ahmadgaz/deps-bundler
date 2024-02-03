import cors from "cors";
import morgan from "morgan";
import express from "express";

import requestLog from "./middleware/requestLog";
import noQuery from "./middleware/noQuery";
import validatePackagePathname from "./middleware/validatePackagePathname";
import validatePackageName from "./middleware/validatePackageName";
import validatePackageVersion from "./middleware/validatePackageVersion";
import validateFilename from "./middleware/validateFilename";
// import findEntry from "./middleware/findEntry";
// import serveFile from "./middleware/serveFile";

const app = express();

app.disable("x-powered-by");
app.enable("trust proxy");
app.enable("strict routing");

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

app.use(cors());
app.use(express.static("public", { maxAge: "1y" }));

app.use(requestLog);

app.get(
    "*",
    noQuery,
    validatePackagePathname,
    validatePackageName,
    validatePackageVersion,
    validateFilename
    // findEntry,
    // serveFile
);

app.listen(3000, () => {
    console.log("Server listening on port 3000");
});
