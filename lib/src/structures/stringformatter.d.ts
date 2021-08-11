export interface IStringFormatterVars {
    [key: string]: string | null | undefined;
}
interface IStringFormatterInsertVarResult {
    result: string;
    length: number;
}
interface IStringFormatterGetIfPartsResult {
    if: string;
    then: string;
    else: string;
    length: number;
}
export declare class StringFormatter {
    static format(pattern: string, vars: IStringFormatterVars): string;
    static insertVar(pattern: string, vars: IStringFormatterVars, i: number): IStringFormatterInsertVarResult;
    static getIfParts(pattern: string, i: number): IStringFormatterGetIfPartsResult;
    static scanBlock(pattern: string, i: number, chars: string): string;
    static condition(pattern: string, vars: IStringFormatterVars): string;
}
export {};
