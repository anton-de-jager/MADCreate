import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import type { ApiResponse } from '@madcreate/shared';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.base}${path}`, { params: toParams(params) })
      .pipe(map((r) => this.unwrap(r)));
  }
  post<T, B = unknown>(path: string, body?: B, params?: Record<string, string | number | boolean | undefined | null>): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.base}${path}`, body, { params: toParams(params) })
      .pipe(map((r) => this.unwrap(r)));
  }
  patch<T, B = unknown>(path: string, body?: B, params?: Record<string, string | number | boolean | undefined | null>): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.base}${path}`, body, { params: toParams(params) })
      .pipe(map((r) => this.unwrap(r)));
  }
  delete<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(`${this.base}${path}`, { params: toParams(params) })
      .pipe(map((r) => this.unwrap(r)));
  }

  /** POST that exposes raw HttpEvents (e.g. upload progress). */
  postWithProgress<B = unknown>(path: string, body: B, params?: Record<string, string | number | boolean | undefined | null>): Observable<HttpEvent<unknown>> {
    return this.http.post(`${this.base}${path}`, body, {
      params: toParams(params),
      reportProgress: true,
      observe: 'events',
    });
  }

  private unwrap<T>(r: ApiResponse<T>): T {
    if (!r.ok) throw new Error(r.error.message);
    return r.data;
  }
}

function toParams(p?: Record<string, string | number | boolean | undefined | null>): HttpParams | undefined {
  if (!p) return undefined;
  let params = new HttpParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
  }
  return params;
}
