/// <reference types="node" />
import { Appservice, Intent, MatrixClient } from "@sorunome/matrix-bot-sdk";
import * as prometheus from "prom-client";
import { EventEmitter } from "events";
import { EmoteSyncroniser } from "./emotesyncroniser";
import { EventSyncroniser } from "./eventsyncroniser";
import { RoomSyncroniser } from "./roomsyncroniser";
import { UserSyncroniser } from "./usersyncroniser";
import { GroupSyncroniser } from "./groupsyncroniser";
import { Config } from "./config";
import { DbUserStore } from "./db/userstore";
import { DbRoomStore } from "./db/roomstore";
import { DbGroupStore } from "./db/groupstore";
import { DbPuppetStore, IMxidInfo } from "./db/puppetstore";
import { DbEventStore } from "./db/eventstore";
import { DbReactionStore } from "./db/reactionstore";
import { Provisioner } from "./provisioner";
import { Store } from "./store";
import { BotProvisioner, ICommand } from "./botprovisioner";
import { ProvisioningAPI } from "./provisioningapi";
import { PresenceHandler } from "./presencehandler";
import { TypingHandler } from "./typinghandler";
import { ReactionHandler } from "./reactionhandler";
import { NamespaceHandler } from "./namespacehandler";
import { DelayedFunction } from "./structures/delayedfunction";
import { IPuppetBridgeRegOpts, IPuppetBridgeFeatures, IReceiveParams, IMessageEvent, IProtocolInformation, CreateRoomHook, CreateUserHook, CreateGroupHook, GetDescHook, BotHeaderMsgHook, GetDataFromStrHook, GetDmRoomIdHook, ListUsersHook, ListRoomsHook, ListGroupsHook, IRemoteUser, IRemoteRoom, IRemoteGroup, IPuppetData, GetUserIdsInRoomHook, UserExistsHook, RoomExistsHook, GroupExistsHook, ResolveRoomIdHook, IEventInfo, MatrixPresence } from "./interfaces";
export interface IPuppetBridgeHooks {
    createUser?: CreateUserHook;
    createRoom?: CreateRoomHook;
    createGroup?: CreateGroupHook;
    userExists?: UserExistsHook;
    roomExists?: RoomExistsHook;
    groupExists?: GroupExistsHook;
    getDesc?: GetDescHook;
    botHeaderMsg?: BotHeaderMsgHook;
    getDataFromStr?: GetDataFromStrHook;
    getDmRoomId?: GetDmRoomIdHook;
    listUsers?: ListUsersHook;
    listRooms?: ListRoomsHook;
    listGroups?: ListGroupsHook;
    getUserIdsInRoom?: GetUserIdsInRoomHook;
    resolveRoomId?: ResolveRoomIdHook;
}
interface ISetProtocolInformation extends IProtocolInformation {
    id: string;
    displayname: string;
    features: IPuppetBridgeFeatures;
    namePatterns: {
        user: string;
        userOverride: string;
        room: string;
        group: string;
        emote: string;
    };
}
export declare class BridgeMetrics {
    room: prometheus.Gauge<string>;
    puppet: prometheus.Gauge<string>;
    message: prometheus.Counter<string>;
    remoteUser: prometheus.Gauge<string>;
    matrixEvent: prometheus.Counter<string>;
    matrixEventBucket: prometheus.Histogram<string>;
    matrixEventError: prometheus.Counter<string>;
    remoteUpdateBucket: prometheus.Histogram<string>;
    connected: prometheus.Gauge<string>;
}
export declare class PuppetBridge extends EventEmitter {
    private registrationPath;
    private configPath;
    emoteSync: EmoteSyncroniser;
    eventSync: EventSyncroniser;
    roomSync: RoomSyncroniser;
    userSync: UserSyncroniser;
    groupSync: GroupSyncroniser;
    hooks: IPuppetBridgeHooks;
    config: Config;
    provisioner: Provisioner;
    store: Store;
    protocol: ISetProtocolInformation;
    delayedFunction: DelayedFunction;
    botProvisioner: BotProvisioner;
    provisioningAPI: ProvisioningAPI;
    typingHandler: TypingHandler;
    presenceHandler: PresenceHandler;
    reactionHandler: ReactionHandler;
    namespaceHandler: NamespaceHandler;
    metrics: BridgeMetrics;
    private appservice;
    private mxcLookupLock;
    private matrixEventHandler;
    private remoteEventHandler;
    private connectionMetricStatus;
    constructor(registrationPath: string, configPath: string, prot?: IProtocolInformation);
    /** @internal */
    readConfig(addAppservice?: boolean): void;
    /**
     * Initialize the puppet bridge
     */
    init(): Promise<void>;
    /**
     * Generate a registration file
     */
    generateRegistration(opts: IPuppetBridgeRegOpts): void;
    get AS(): Appservice;
    get botIntent(): Intent;
    get userStore(): DbUserStore;
    get roomStore(): DbRoomStore;
    get groupStore(): DbGroupStore;
    get puppetStore(): DbPuppetStore;
    get eventStore(): DbEventStore;
    get reactionStore(): DbReactionStore;
    get Config(): Config;
    get groupSyncEnabled(): boolean;
    /**
     * Start the puppeting bridge
     */
    start(callback?: () => Promise<void>): Promise<void>;
    setCreateUserHook(hook: CreateUserHook): void;
    setCreateRoomHook(hook: CreateRoomHook): void;
    setCreateGroupHook(hook: CreateGroupHook): void;
    setUserExistsHook(hook: UserExistsHook): void;
    setRoomExistsHook(hook: RoomExistsHook): void;
    setGroupExistsHook(hook: GroupExistsHook): void;
    setGetDescHook(hook: GetDescHook): void;
    setBotHeaderMsgHook(hook: BotHeaderMsgHook): void;
    setGetDataFromStrHook(hook: GetDataFromStrHook): void;
    setGetDmRoomIdHook(hook: GetDmRoomIdHook): void;
    setListUsersHook(hook: ListUsersHook): void;
    setListRoomsHook(hook: ListRoomsHook): void;
    setListGroupsHook(hook: ListGroupsHook): void;
    setGetUserIdsInRoomHook(hook: GetUserIdsInRoomHook): void;
    setResolveRoomIdHook(hook: ResolveRoomIdHook): void;
    /**
     * Set what the remote user ID of a puppet is
     */
    setUserId(puppetId: number, userId: string): Promise<void>;
    /**
     * Set (store) the data associated with a puppet, if you change it
     */
    setPuppetData(puppetId: number, data: IPuppetData): Promise<void>;
    /**
     * Update a given remote users profile
     */
    updateUser(user: IRemoteUser): Promise<void>;
    /**
     * Update the information on a remote room
     */
    updateRoom(room: IRemoteRoom): Promise<void>;
    /**
     * Update the information on a remote group
     */
    updateGroup(group: IRemoteGroup): Promise<void>;
    /**
     * Trigger a remote room to be bridged
     */
    bridgeRoom(roomData: IRemoteRoom): Promise<void>;
    /**
     * Unbridge a room, given an mxid
     */
    unbridgeRoomByMxid(mxid: string): Promise<void>;
    /**
     * Unbridge a remote room
     */
    unbridgeRoom(room: IRemoteRoom | null): Promise<void>;
    /**
     * Set presence of a remote user
     */
    setUserPresence(user: IRemoteUser, presence: MatrixPresence): Promise<void>;
    /**
     * Set the status message of a remote user
     */
    setUserStatus(user: IRemoteUser, status: string): Promise<void>;
    /**
     * Set if a remote user is typing in a room or not
     */
    setUserTyping(params: IReceiveParams, typing: boolean): Promise<void>;
    /**
     * Send a read receipt of a remote user to matrix
     */
    sendReadReceipt(params: IReceiveParams): Promise<void>;
    /**
     * Adds a user to a room
     */
    addUser(params: IReceiveParams): Promise<void>;
    /**
     * Removes a user from a room
     */
    removeUser(params: IReceiveParams): Promise<void>;
    /**
     * Get the mxid for a given remote user
     */
    getMxidForUser(user: IRemoteUser, doublePuppetCheck?: boolean): Promise<string>;
    /**
     * Get the mxid for a given remote room
     */
    getMxidForRoom(room: IRemoteRoom): Promise<string>;
    /**
     * Get the URL from an MXC uri
     */
    getUrlFromMxc(mxc: string, width?: number, height?: number, method?: string): string;
    /**
     * Get the info (name, avatar) of the the specified puppet
     */
    getPuppetMxidInfo(puppetId: number): Promise<IMxidInfo | null>;
    trackConnectionStatus(puppetId: number, isConnected: boolean): void;
    /**
     * Send a status message either to the status message room or to a specified room
     */
    sendStatusMessage(puppetId: number | IRemoteRoom, msg: string, isConnected?: boolean | null): Promise<void>;
    /**
     * Registers a custom command with the bot provisioner
     */
    registerCommand(name: string, command: ICommand): void;
    /**
     * Send a file to matrix, auto-detect its type
     */
    sendFileDetect(params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    /**
     * Send an m.file to matrix
     */
    sendFile(params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    /**
     * Send an m.video to matrix
     */
    sendVideo(params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    /**
     * Send an m.audio to matrix
     */
    sendAudio(params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    /**
     * Send an m.image to matrix
     */
    sendImage(params: IReceiveParams, thing: string | Buffer, name?: string): Promise<void>;
    /**
     * Send a message to matrix
     */
    sendMessage(params: IReceiveParams, opts: IMessageEvent): Promise<void>;
    /**
     * Send an edit to matrix
     */
    sendEdit(params: IReceiveParams, eventId: string, opts: IMessageEvent, ix?: number): Promise<void>;
    /**
     * Send a redaction to matrix
     */
    sendRedact(params: IReceiveParams, eventId: string): Promise<void>;
    /**
     * Send a reply to matrix
     */
    sendReply(params: IReceiveParams, eventId: string, opts: IMessageEvent): Promise<void>;
    /**
     * Send a reaction to matrix
     */
    sendReaction(params: IReceiveParams, eventId: string, reaction: string): Promise<void>;
    /**
     * Remove a reaction from matrix
     */
    removeReaction(params: IReceiveParams, eventId: string, reaction: string): Promise<void>;
    /**
     * Remove all reactions from a certain event
     */
    removeAllReactions(params: IReceiveParams, eventId: string): Promise<void>;
    /**
     * Wraps a matrix client to use the mediaUrl endpoint instead
     */
    getMediaClient(client: MatrixClient): Promise<MatrixClient>;
    /**
     * Upload content to matrix, automatically de-duping it
     */
    uploadContent(client: MatrixClient | null, thing: string | Buffer, mimetype?: string, filename?: string): Promise<string>;
    /**
     * Redacts an event and re-tries as room OP
     */
    redactEvent(client: MatrixClient, roomId: string, eventId: string): Promise<void>;
    getEventInfo(roomId: string | IRemoteRoom, eventId: string, client?: MatrixClient): Promise<IEventInfo | null>;
}
export {};
