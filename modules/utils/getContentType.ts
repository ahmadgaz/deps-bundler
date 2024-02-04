import path from "path";
import { Mime } from "mime";

const mime = new Mime();
mime.define(
    {
        "text/plain": [
            "authors",
            "changes",
            "license",
            "makefile",
            "patents",
            "readme",
            "ts",
            "flow",
        ],
    },
    true
);

const textFiles = /\/?(\.[a-z]*rc|\.git[a-z]*|\.[a-z]*ignore|\.lock)$/i;

const getContentType = (file: string): string => {
    const name = path.basename(file);

    return textFiles.test(name)
        ? "text/plain"
        : mime.getType(name) || "text/plain";
};

export default getContentType;
