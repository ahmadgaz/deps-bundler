import { NextFunction, Request, Response } from "express";
import util from "util";

import { LogType } from "modules/types";

const ENABLE_DEBUGGING = process.env.DEBUG != null;

function createLog(): LogType {
    return {
        debug: ENABLE_DEBUGGING
            ? (format: string, ...args: string[]) => {
                  console.log(util.format(format, ...args));
              }
            : () => {},
        info: (format: string, ...args: string[]) => {
            console.log(util.format(format, ...args));
        },
        error: (format: string, ...args: string[]) => {
            console.error(util.format(format, ...args));
        },
    };
}

export default function requestLog(
    _req: Request,
    res: Response,
    next: NextFunction
) {
    res.locals.log = createLog();
    next();
}
