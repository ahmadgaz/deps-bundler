import { LogType, PackageRequestType } from "modules/types";

declare global {
    namespace Express {
        interface Locals {
            package: PackageRequestType;
            log: LogType;
        }
    }
}
