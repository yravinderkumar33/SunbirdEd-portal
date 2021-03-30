import { EventEmitter } from "@angular/core";
import { IBase, IFilterConfig } from "./IBase";

type IReportType = "chart";

export interface IChart extends IBase {

    type: IChartType;
    readonly reportType: IReportType;
    readonly _defaultConfig: Partial<IChartOptions>;
    
    config: Partial<IChartOptions>;

    chartClick: EventEmitter<any>;
    chartHover: EventEmitter<any>;

    chartBuilder(config);

    refreshChart();

    addData({ label, data, config });

    removeData();
    removeData(label: string);

    getTelemetry();

    getCurrentSelection();

    getDatasetAtIndex(index: number);
}


export type IChartType = "bar" | "line" | "pie" | "horizontal-bar" | "vertical-bar" | "bubble";

export type IChartOptions = {
    labels: string[],
    labelExpr: string;
    datasets: IDataset[];
    tooltip: object;
    legend: object | boolean;
    animation: object;
    colors: object | object[];
    title: string | object;
    description: string;
    subtitle: string;
    caption: object;
    filters: IFilterConfig;
    responsive: boolean;
    scales: {
        axes: any;
        [key: string]: any;
    };
    [key: string]: any;
};

export type IDataset = {
    label: string;
    dataExpr?: string;
    data: any[];
}