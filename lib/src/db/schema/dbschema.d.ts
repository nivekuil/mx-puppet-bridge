import { Store } from "../../store";
export interface IDbSchema {
    description: string;
    run(store: Store): Promise<null | void | Error | Error[]>;
    rollBack(store: Store): Promise<null | void | Error | Error[]>;
}
