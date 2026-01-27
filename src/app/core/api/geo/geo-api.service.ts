import { ReverseGeoResponse } from './geo.models';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GeoApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  reverse(lat: number, lng: number) {
    return this.http.get<ReverseGeoResponse>(`${this.apiBase}/v1/public/geo/reverse`, {
      params: { lat, lng },
    });
  }
}
