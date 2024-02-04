import { RequestHandler, NextFunction, Request, Response } from "express";

/**
 * Useful for wrapping `async` request handlers in Express
 * so they automatically propagate errors.
 */
export default function asyncHandler(handler: RequestHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch((error) => {
            res.locals.log.error(`Unexpected error in ${handler.name}!`);
            res.locals.log.error(error.stack);

            next(error);
        });
    };
}
