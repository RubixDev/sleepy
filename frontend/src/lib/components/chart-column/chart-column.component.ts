import { Component, computed, input } from '@angular/core';

@Component({
  selector: '[app-chart-column]',
  imports: [],
  templateUrl: './chart-column.component.html',
  styleUrl: './chart-column.component.scss',
  standalone: true,
})
export class ChartColumnComponent {
  readonly index = input.required<number>();
  readonly events = input.required<Date[]>();
  readonly startIndex = input(0);

  readonly spans = computed(() =>
    this.events()
      .concat(this.nextMidnight(this.events().slice(-1)[0]))
      .reduce(
        (acc, curr, idx, arr) => {
          const prev = idx === 0 ? this.prevMidnight(curr) : arr[idx - 1];
          return [
            ...acc,
            [
              acc.reduce((sum, n) => sum + n[1], 0), // partial sum
              ((curr.getTime() - prev.getTime()) / 1000 / 60 / 60 / 24) * 100, // percentage of day
            ] as [number, number],
          ];
        },
        [] as [number, number][],
      ),
  );

  private prevMidnight(date: Date): Date {
    const res = new Date(date);
    res.setUTCHours(0);
    res.setUTCMinutes(0);
    return res;
  }

  private nextMidnight(date: Date): Date {
    const res = new Date(date);
    res.setUTCHours(0);
    res.setUTCMinutes(0);
    res.setUTCDate(date.getUTCDate() + 1);
    return res;
  }
}
