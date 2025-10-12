import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface TimeEntry {
  time: string;
  estimated: boolean;
}

export type Stats = GenericStats<Date>;
export type StatsDto = GenericStats<string>;

export interface GenericStats<T> {
  longest_awake: [T, string][];
  shortest_awake: [T, string][];
  longest_asleep: [T, string][];
  shortest_asleep: [T, string][];
  earliest_wake: [T, string][];
  earliest_sleep: [T, string][];
  latest_wake: [T, string][];
  latest_sleep: [T, string][];
  avg_awake: string;
  avg_asleep: string;
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

  getStats$(): Observable<Stats> {
    return this.http.get<StatsDto>('api/stats').pipe(
      map((dto) => {
        return {
          longest_awake: dto.longest_awake.map((e) => [new Date(e[0]), e[1]]),
          shortest_awake: dto.shortest_awake.map((e) => [new Date(e[0]), e[1]]),
          longest_asleep: dto.longest_asleep.map((e) => [new Date(e[0]), e[1]]),
          shortest_asleep: dto.shortest_asleep.map((e) => [new Date(e[0]), e[1]]),
          earliest_wake: dto.earliest_wake.map((e) => [new Date(e[0]), e[1]]),
          earliest_sleep: dto.earliest_sleep.map((e) => [new Date(e[0]), e[1]]),
          latest_wake: dto.latest_wake.map((e) => [new Date(e[0]), e[1]]),
          latest_sleep: dto.latest_sleep.map((e) => [new Date(e[0]), e[1]]),
          avg_awake: dto.avg_awake,
          avg_asleep: dto.avg_asleep,
        };
      }),
    );
  }
}
