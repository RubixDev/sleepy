import { Component } from '@angular/core';
import { ApiService } from '../lib/services/api.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { ChartComponent } from '../lib/components/chart/chart.component';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, ChartComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  entries$: Observable<Date[]>;

  constructor(private apiService: ApiService) {
    this.entries$ = apiService.getEntries$();
  }
}
