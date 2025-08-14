import { Injectable } from '@angular/core';
import { environment } from '../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {

  getAppId = (): string => {
    return environment.appId;
  }

  isProduction = (): boolean => {
    return environment.production;
  }

  getApiUrl = (): string => {
    return environment.apiUrl;
  }

  canPerformLogging = (): boolean => {
    return environment.logging;
  }

  getFeatureFlag = (): boolean => {
    return environment.featureFlag;
  }
}
