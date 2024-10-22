import {FixedLengthList} from "@/utils/fixedLengthList";

export namespace PropertyManager {
    const cpu = new FixedLengthList(60);
    const memory = new FixedLengthList(60);
}