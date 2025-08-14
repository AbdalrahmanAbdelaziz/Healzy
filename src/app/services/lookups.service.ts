import { inject, Injectable, OnDestroy } from "@angular/core";
import { Observable, Subscription, catchError, throwError } from "rxjs";
import { APIResponse } from "../shared/models/api-response.dto";
import { HttpClient } from "@angular/common/http";
import { Lookup } from "../shared/models/lookup.model";
import { EnvironmentService } from "./environment.service";

@Injectable({ providedIn: "root" })
export class LookupsService {

  private _envService = inject(EnvironmentService);
  private _httpClient = inject(HttpClient);

  loadGenders(){
    return this._httpClient.get<APIResponse<Lookup[]>>(this._envService.getApiUrl() + "/api/gender/all")
    .pipe(
      catchError((e) => {
        return throwError(()=> e)
      })
    );
  }

  loadCountries(){
    return this._httpClient.get<APIResponse<Lookup[]>>(this._envService.getApiUrl() + "/api/country/all")
    .pipe(
      catchError((e) => {
        return throwError(()=> e)
      })
    );
  }

  loadGovernoratesOfCountry(countryId: number){
    return this._httpClient.get<APIResponse<Lookup[]>>(this._envService.getApiUrl()
              + "/api/Country/GovernoratesOfCountry"+ countryId.toString())
    .pipe(
      catchError((e) => {
        return throwError(()=> e)
      })
    );
  }

  loadDistrictsOfGovernorate(governorateId: number){
    return this._httpClient.get<APIResponse<Lookup[]>>(this._envService.getApiUrl()
              + "/api/Governorate/DistrictsOfGovernorate" + governorateId.toString())
    .pipe(
      catchError((e) => {
        return throwError(()=> e)
      })
    );
  }
}
