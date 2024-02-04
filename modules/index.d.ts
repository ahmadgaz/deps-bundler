import { Entry, LogType, PackageRequestType } from "modules/types";

declare global {
    namespace Express {
        interface Locals {
            entry: Entry;
            package: PackageRequestType;
            log: LogType;
        }
    }
}
