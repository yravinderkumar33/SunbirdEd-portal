import { Component, OnInit, ViewChild } from '@angular/core';
import { DataService } from '../../services';
import { BaseChartDirective } from 'ng2-charts';
import { IData, InitConfig, IReportType, IDataset } from '../../types';
import { BaseComponent } from '../base/base.component';
import { IChartOptions, IChartType } from '../../types/IChart';
import { get, groupBy, mapValues, sumBy } from 'lodash-es';
import { tap } from 'rxjs/operators';
@Component({
  selector: 'sb-chart-js',
  templateUrl: './chart-js.component.html',
  styleUrls: ['./chart-js.component.css']
})
export class ChartJsComponent extends BaseComponent implements OnInit {

  private readonly reportType: IReportType = "chart";

  @ViewChild(BaseChartDirective, { static: true}) baseChartDirective: BaseChartDirective;

  data: IData;

  _defaultConfig: Partial<IChartOptions> = {
    labels: [],
    datasets: [],
    legend: true,
    responsive: true
  };

  config: Partial<IChartOptions>;

  type: IChartType;

  public chartData;

  reset(): void {
    throw new Error('Method not implemented.');
  }

  // destroy(): void {
  //   throw new Error('Method not implemented.');
  // }

  // update(config: any) {
  //   throw new Error('Method not implemented.');
  // }

  constructor(protected dataService: DataService) {
    super(dataService);
  }

  // private getLabelsAndDatasets<T, U extends keyof T>(data: T[], labelExpr: U) {
  private getLabelsAndDatasets(data, labelExpr) {

    const groupedDataBasedOnLabels = groupBy(data, (val) => {
      const value = val[labelExpr];
      return value && typeof value === 'string' ? value.toLowerCase().trim() : '';
    });

    return {
      getLabels: () => Object.keys(groupedDataBasedOnLabels),
      getDatasets: (datasets: IDataset[]) => {
        return datasets.map(dataset => {
          return {
            ...dataset,
            ...(dataset.dataExpr && {
              data: Object.values(mapValues(groupedDataBasedOnLabels, value => {
                value = value.filter(element => {
                  if (element[dataset.dataExpr]) {
                    return element;
                  }
                  return false;
                })
                return sumBy(value, (o) => +o[dataset.dataExpr])
              }))
            })
          }
        })
      }
    }
  }

  private chartBuilder(config: Partial<IChartOptions>, data) {
    let { labels = [], labelExpr = null, type = null, legend = true, colors = [], datasets, options = {}, ...others } = config;
    options = { ...others, ...options };

    if (labelExpr) {
      const { getLabels, getDatasets } = this.getLabelsAndDatasets(data, labelExpr);
      labels = getLabels();
      datasets = getDatasets(datasets);
    }

    this.chartData = { labels, datasets, options, type, legend, colors };
  }


  initialize({ config, type, data }: InitConfig): void {
    if (!config || !type || !data) throw new Error('Syntax Error');
    this.config = config = { ...config, type };
    this.fetchData(data)
      .pipe(
        tap(data => {
          this.chartBuilder(config, data);
        })
      ).subscribe()
  }

  ngOnInit(): void {
  }

}
