import { HttpClient } from '@angular/common/http';
import { Observable, of, combineLatest, throwError, empty } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import * as _ from 'lodash-es';
import { mergeMap, catchError, tap } from 'rxjs/operators';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Router } from '@angular/router';
import { isNull } from '@angular/compiler/src/output/output_ast';

@Injectable({
  providedIn: 'root'
})
export class StartupService {
  private _fingerprintInfo: any;
  private http: HttpClient;
  private router: Router;
  private experiment: any;
  constructor(private injector: Injector, private deviceDetectorService: DeviceDetectorService) { }

  public init() {
    this.http = this.injector.get(HttpClient);
    this.router = this.injector.get(Router);
    return this.callDeviceRegisterApi()
      .toPromise();
  };


get experimentDetails(){
    return this.experiment;
}

  callDeviceRegisterApi() {
    return combineLatest(this.fetchDeviceId(), this.fetchUaspec())
      .pipe(
        mergeMap(deviceInfo => this.registerDeviceId(deviceInfo)),
        tap(experimentDetails => {
          if (_.get(experimentDetails, 'result.actions') && _.get(experimentDetails, 'result.actions').length > 0) {
            this.experiment = _.find(_.get(experimentDetails, 'result.actions'), action => _.get(action, 'type') === 'experiment');
            const expIdElement = (<HTMLInputElement>document.getElementById('expId'));
            const expID = expIdElement ? expIdElement.value : undefined;
            const reload = _.get(experimentDetails, 'result.reload');
            if (this.experiment && window && _.get(window, 'location') && !expID && reload && reload === true) {
              window.location.reload();
            }
          }
        }),
        catchError(error => {
          console.error('device Register failed', error);
          return empty();
        })
      )
  }



  /*
   * fetch device info using deviceDetector Service
  */
  fetchUaspec() {
    const deviceInfo = this.deviceDetectorService.getDeviceInfo();
    return of({
      agent: deviceInfo.browser,
      ver: deviceInfo.browser_version,
      system: deviceInfo.os_version,
      platform: deviceInfo.os,
      raw: deviceInfo.userAgent
    });
  }

  /**
   * fetch device id using fingerPrint2 library.
   */
  private fetchDeviceId(): Observable<string> {
    return new Observable(observer => EkTelemetry.getFingerPrint((deviceId, components, version) => {
      this._fingerprintInfo = { deviceId, components, version };
      (<HTMLInputElement>document.getElementById('deviceId')).value = deviceId;
      observer.next(deviceId);
      observer.complete();
    }));
  }

  /**
  * Register the did from portal backend 
  * pass did as parameter
  */
  private registerDeviceId([did, uaspec]) {
    const request = {
      did: did || _.get(this._fingerprintInfo, 'deviceId'),
      uaspec: uaspec
    }
    return this.http.post('/experiment', request).pipe(
      mergeMap(apiResponse => {
        if (_.get(apiResponse, 'responseCode') === 'OK') {
          return of(apiResponse);
        } else {
          return throwError(apiResponse);
        }
      })
    )
  }
}

