import { Component, input } from '@angular/core';
import { ApiService, Stats } from '../../services/api.service';
import { identity, Observable, shareReplay, startWith, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { AsyncPipe } from '@angular/common';

const COLUMNS_WITH_DATE: (keyof Stats)[] = [
  'longest_awake',
  'shortest_awake',
  'longest_asleep',
  'shortest_asleep',
  'earliest_wake',
  'latest_wake',
  'earliest_sleep',
  'latest_sleep',
];
type ColumnsWithDate = (typeof COLUMNS_WITH_DATE)[number];

@Component({
  selector: 'app-stats',
  imports: [MatCardModule, AsyncPipe],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
  standalone: true,
})
export class StatsComponent {
  readonly reload$ = input.required<Observable<void>>();

  readonly stats$ = toObservable(this.reload$).pipe(
    switchMap(identity),
    startWith(undefined),
    switchMap(() => this.apiService.getStats$()),
    shareReplay(1),
  );

  constructor(private apiService: ApiService) {}

  readonly columns = [1, 2, 3, 4, 5];
  readonly columnsWithDate: ColumnsWithDate[] = COLUMNS_WITH_DATE;

  getColumn(stats: Stats, column: ColumnsWithDate): [Date, string][] {
    return stats[column] as [Date, string][];
  }
}
