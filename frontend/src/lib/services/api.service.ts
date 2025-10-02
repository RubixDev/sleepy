import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface TimeEntry {
  time: string;
  estimated: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getEntries$(): Observable<Date[]> {
    return this.http
      .get<string[]>('api/entries')
      .pipe(map((list) => list.map((str) => new Date(str + 'Z'))));
  }

  addEntry$(entry: TimeEntry): Observable<void> {
    return this.http.post<void>('api/entry', entry);
  }

  removeEntry$(): Observable<void> {
    return this.http.delete<void>('api/entry');
  }
}
