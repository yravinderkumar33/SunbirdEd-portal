import { HttpClient } from '@angular/common/http';
import { Observable, of, combineLatest } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import * as _ from 'lodash-es';
import { mergeMap } from 'rxjs/operators';
import { DeviceDetectorService } from 'ngx-device-detector';

@Injectable({
  providedIn: 'root'
})
export class StartupService {
  private _fingerprintInfo: any;
  private http: HttpClient;

  constructor(private injector: Injector, private deviceDetectorService: DeviceDetectorService) { }

  public init() {
    this.http = this.injector.get(HttpClient);
    return this.callDeviceRegisterApi()
    .toPromise()
    // return Promise.resolve(1);
  };


  callDeviceRegisterApi() {
    return combineLatest(this.fetchDeviceId(), this.fetchUaspec())
      .pipe(
        mergeMap(deviceInfo => this.registerDeviceId(deviceInfo))
      )
  }



  /*
   * fetch device info using deviceDetector Service
  */
  fetchUaspec() {
    const deviceInfo = this.deviceDetectorService.getDeviceInfo();
    return of({
      agent: deviceInfo.browser,
      ver: deviceInfo.browser_version,
      system: deviceInfo.os_version,
      platform: deviceInfo.os,
      raw: deviceInfo.userAgent
    });
  }

  /**
   * fetch device id using fingerPrint2 library.
   */
  private fetchDeviceId(): Observable<string> {
    return new Observable(observer => EkTelemetry.getFingerPrint((deviceId, components, version) => {
      this._fingerprintInfo = { deviceId, components, version };
      (<HTMLInputElement>document.getElementById('deviceId')).value = deviceId;
      observer.next(deviceId);
      observer.complete();
    }));
  }

  /**
  * Register the did from portal backend 
  * pass did as parameter
  */
  private registerDeviceId([did, uaspec]) {
    const request = {
      did: did || _.get(this._fingerprintInfo, 'deviceId'),
      uaspec: uaspec
    }
    return this.http.post('/experiment', request)
  }
}
