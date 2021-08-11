import { IDbSchema } from "./dbschema";
import { Store } from "../../store";
export declare class Schema implements IDbSchema {
    description: string;
    run(store: Store): Promise<void>;
    rollBack(store: Store): Promise<void>;
}
