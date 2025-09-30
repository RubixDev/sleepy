import { Component, computed, input } from '@angular/core';
import { ChartColumnComponent } from '../chart-column/chart-column.component';

@Component({
  selector: 'app-chart',
  imports: [ChartColumnComponent],
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
      ),
  );
}
