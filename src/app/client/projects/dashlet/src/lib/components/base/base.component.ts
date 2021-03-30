import { EventEmitter } from '@angular/core';
import { DataService } from '../../services';
import { Observable, of } from 'rxjs';
import { InitConfig, IBase, IData, IReportState } from '../../types';

import { tap } from 'rxjs/operators';

export abstract class BaseComponent implements Partial<IBase> {

  abstract config;

  constructor(protected dataService: DataService) { }

  height: string = "100%";
  width: string = "100%";
  id: string;

  state: EventEmitter<IReportState> = new EventEmitter();

  abstract data: IData;
  // abstract reportType: IReportType;
  // abstract _defaultConfig: object;
  // abstract config: object;

  abstract initialize(config: InitConfig): void
  // abstract reset(): void;
  // abstract destroy(): void;
  // abstract update(config: any)

  fetchData(config: IData): Observable<any[]> {
    const { values = null, location: { url = null, apiConfig = {} } = {} } = config || {};
    if (values) return of(values);
    let input = { url, ...apiConfig };
    this.state.emit('pending');
    return this.dataService.fetchData(input).pipe(
      tap(_ => this.state.emit('done'))
    );
  }

  getConfigValue(key: string) {
    return this.config[key];
  }
}
