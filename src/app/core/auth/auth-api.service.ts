import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { GoogleLoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/+$/, '/') // asegura 1 slash al final

loginWithGoogle(idToken: string, phone?: string): Observable<GoogleLoginResponse> {
  return this.http.post<GoogleLoginResponse>(`${this.base}v1/auth/firebase/google`, {
    id_token: idToken,
    ...(phone ? { phone } : {}),
  });
  }
}
