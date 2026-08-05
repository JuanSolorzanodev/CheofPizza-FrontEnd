import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  AdminBusinessSettingsPayload,
  AdminBusinessSettingsResponse,
} from './admin-settings.models';

@Injectable({
  providedIn: 'root',
})
export class AdminSettingsApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = environment.apiUrl.replace(/\/+$/, '');
  private readonly baseUrl = `${this.apiBase}/v1/admin/settings`;

  getSettings(): Observable<AdminBusinessSettingsResponse> {
    return this.http.get<AdminBusinessSettingsResponse>(this.baseUrl);
  }

  updateSettings(
    payload: AdminBusinessSettingsPayload,
  ): Observable<AdminBusinessSettingsResponse> {
    return this.http.put<AdminBusinessSettingsResponse>(
      this.baseUrl,
      payload,
    );
  }
}
