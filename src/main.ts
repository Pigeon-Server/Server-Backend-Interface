import path from "path";
import alias from "module-alias";

alias(path.resolve(__dirname, "../"));

import {logger} from "@/base/logger";

logger.debug("Initializing...");

import {SyncFileManager} from "@/manager/syncFileManager";
SyncFileManager.checkSyncCache();

logger.debug("Initialization complete");
