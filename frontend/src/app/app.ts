import { Component } from '@angular/core';
import { ApiService } from '../lib/services/api.service';
import { shareReplay, startWith, Subject, switchMap } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { ChartComponent } from '../lib/components/chart/chart.component';
import { MatCardModule } from '@angular/material/card';
import { AddFormComponent } from '../lib/components/add-form/add-form.component';
import { ThemePickerComponent } from '../lib/components/theme-picker/theme-picker.component';
import { StatsComponent } from '../lib/components/stats/stats.component';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    ChartComponent,
    MatCardModule,
    AddFormComponent,
    ThemePickerComponent,
    StatsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App {
  readonly reload$ = new Subject<void>();
  readonly entries$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() => this.apiService.getEntries$()),
    shareReplay(1),
  );

  constructor(private apiService: ApiService) {}
}
