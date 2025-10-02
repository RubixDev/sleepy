import { Component, computed, input } from '@angular/core';
import { ChartColumnComponent } from '../chart-column/chart-column.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-chart',
  imports: [ChartColumnComponent, MatTooltipModule],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
  standalone: true,
})
export class ChartComponent {
  data = input.required<Date[]>();

  chunkedData = computed(() =>
    this.data()
      .reduce((acc, curr, idx, arr) => {
        const prev = idx === 0 ? null : arr[idx - 1];
        return prev?.toISOString().slice(0, 11) === curr.toISOString().slice(0, 11)
          ? [...acc.slice(0, -1), [...acc.slice(-1)[0], curr]]
          : [...acc, [curr]];
      }, [] as Date[][])
      .reduce(
        (acc, chunk, idx, arr) => [
          ...acc,
          [(acc[idx - 1] ?? [0, []])[0] + (arr[idx - 1] ?? []).length, chunk] as [number, Date[]],
        ],
        [] as [number, Date[]][],
      )
      .reverse(),
  );

  readonly MARKERS = [
    [1 * 60, 1],
    [2 * 60, 1],
    [3 * 60, 1],
    [4 * 60, 1],
    [5 * 60, 1],
    [6 * 60, 2],
    [7 * 60, 1],
    [8 * 60, 1],
    [9 * 60, 1],
    [10 * 60, 1],
    [11 * 60, 1],
    [12 * 60, 2],
    [13 * 60, 1],
    [14 * 60, 1],
    [15 * 60, 1],
    [16 * 60, 1],
    [17 * 60, 1],
    [18 * 60, 1],
    [19 * 60, 1],
    [20 * 60, 1],
    [21 * 60, 2],
    [22 * 60, 1],
    [23 * 60, 1],
  ];
}
