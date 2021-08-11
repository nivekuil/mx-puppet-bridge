import { PuppetBridge } from "./puppetbridge";
import { Router, Request } from "express";
export interface IAuthedRequest extends Request {
    userId: string;
}
export declare class ProvisioningAPI {
    private readonly bridge;
    private readonly mainRouter;
    private readonly apiRouterV1;
    private readonly apiSharedSecret;
    constructor(bridge: PuppetBridge);
    registerProvisioningAPI(): void;
    get v1(): Router;
    private checkProvisioningSharedSecret;
    private status;
    private link;
    private getPuppetId;
    private unlink;
    private listUsers;
    private listRooms;
}
