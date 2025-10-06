import { Component, computed, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { ApiService } from '../../services/api.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  filter,
  map,
  merge,
  Observable,
  shareReplay,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-add-form',
  imports: [
    NgxMatTimepickerModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatCheckboxModule,
    FormsModule,
    AsyncPipe,
  ],
  templateUrl: './add-form.component.html',
  styleUrl: './add-form.component.scss',
  standalone: true,
})
export class AddFormComponent {
  readonly reload = output<void>();

  readonly estimated = signal(false);
  readonly date = signal(new Date());
  readonly time = signal(`${new Date().getHours()}:${new Date().getMinutes()}`);

  private readonly value = computed(() => {
    const date = new Date(this.date());
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);

    const groups = this.time().match(/^(\d?\d):(\d{2})\s*(?:(p)|a)?m?$/i);
    if (groups === null) return date;

    let hours = parseInt(groups[1], 10);
    const minutes = parseInt(groups[2], 10);
    if (hours === 12 && !groups[3]) hours = 0;
    else if (hours < 12 && groups[3]) hours += 12;

    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  });

  private readonly stringValue = computed(() => {
    const year = this.value().getFullYear();
    const month = (this.value().getMonth() + 1).toString().padStart(2, '0');
    const day = this.value().getDate().toString().padStart(2, '0');
    const hour = this.value().getHours().toString().padStart(2, '0');
    const minute = this.value().getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:00`;
  });

  readonly addButtonClick$ = new Subject<void>();
  readonly removeButtonClick$ = new Subject<void>();

  private readonly addEntry$ = this.addButtonClick$.pipe(
    switchMap(() =>
      this.apiService.addEntry$({ time: this.stringValue(), estimated: this.estimated() }),
    ),
    catchError((err, cause) => this.showRequestFailure(err, cause)),
  );
  private readonly removeEntry$ = this.removeButtonClick$.pipe(
    switchMap(() => this.apiService.removeEntry$()),
    catchError((err, cause) => this.showRequestFailure(err, cause)),
  );

  readonly loading$ = merge(
    this.addButtonClick$.pipe(map(() => true)),
    this.removeButtonClick$.pipe(map(() => true)),
    this.addEntry$.pipe(map(() => false)),
    this.removeEntry$.pipe(map(() => false)),
  ).pipe(startWith(false), shareReplay(1));

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
  ) {
    this.loading$
      .pipe(
        filter((loading) => !loading),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reload.emit());
  }

  removeEntry() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: 'Are you sure you want to delete the last entry?' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.removeButtonClick$.next();
    });
  }

  private showRequestFailure(err: HttpErrorResponse, cause: Observable<void>): Observable<void> {
    console.log('Request Error', err);
    this.snackbar.open(err.error, 'Dismiss', { duration: 5000 });
    return cause.pipe(startWith(undefined));
  }
}
