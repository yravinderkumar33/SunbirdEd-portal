import { EventEmitter } from "@angular/core";

export type InitConfig = {
    type: string;
    config: object;
    data: IData
}

export interface IBase {
    reportType: IReportType;
    readonly _defaultConfig: object;
    height: string;
    width: string;
    id: string;
    config: object;
    data: IData; 
    state: EventEmitter<IReportState>;
    initialize(config: InitConfig): void;
    reset(): void;
    destroy(): void;
    update(config);
    fetchData(config: IData);
}

export type IReportType = "chart" | "table";

export type methodType = "GET" | "POST";

export interface IApiConfig {
    url: string;
    body: object | null;
    headers?: {
        [header: string]: string | string[];
    };
    methodType: methodType;
    params?: {
        [param: string]: string | string[];
    };
    response: {
        path: string;
    }
}

export interface IDataSchema {
    type: string,
    enum?: string[],
    default?: string,
    format?: string;
    items?: IDataSchema
}

export interface IData {
    values?: unknown[];
    location?: {
        apiConfig?: IApiConfig;
        url?: string;
    },
    dataSchema?: {
        [key: string]: IDataSchema;
    }
}

export type IReportState = "pending" | "done"; 

export interface IFilterConfig {
    reference: string;
    label: string;
    placeholder: string;
    controlType: "single-select" | "multi-select" | "date";
    searchable?: boolean;
    filters: IFilterConfig[];
    default?: string;
}