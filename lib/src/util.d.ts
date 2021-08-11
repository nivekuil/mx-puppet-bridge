/// <reference types="node" />
import { IProfileDbEntry } from "./db/interfaces";
import { IRemoteProfile } from "./interfaces";
import { OptionsOfBufferResponseBody } from "got";
export interface IMakeUploadFileData {
    avatarUrl?: string | null;
    avatarBuffer?: Buffer | null;
    downloadFile?: ((url: string) => Promise<Buffer>) | null;
}
export declare class Util {
    static DownloadFile(url: string, options?: OptionsOfBufferResponseBody): Promise<Buffer>;
    static GetMimeType(buffer: Buffer): string | undefined;
    static str2mxid(a: string): string;
    static mxid2str(b: string): string;
    static sleep(timeout: number): Promise<void>;
    static AsyncForEach(arr: any, callback: any): Promise<void>;
    static HashBuffer(b: Buffer): string;
    static MaybeUploadFile(uploadFn: (b: Buffer, m?: string, f?: string) => Promise<string>, data: IMakeUploadFileData, oldHash?: string | null): Promise<{
        doUpdate: boolean;
        mxcUrl: string | undefined;
        hash: string;
    }>;
    static ProcessProfileUpdate(oldProfile: IProfileDbEntry | null, newProfile: IRemoteProfile, namePattern: string, uploadFn: (b: Buffer, m?: string, f?: string) => Promise<string>): Promise<IProfileDbEntry>;
    static ffprobe(buffer: Buffer): Promise<any>;
    static getExifOrientation(buffer: Buffer): Promise<number>;
}
