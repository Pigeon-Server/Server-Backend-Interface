import path from "path";
import alias from "module-alias";

alias(path.resolve(__dirname, "../"));

import {Database} from "@/base/mysql";

Database.INSTANCE;
