import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'mc-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class AppComponent {
  // Construct ThemeService eagerly so the saved mode applies before first paint.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- field is never read; inject() is called for its side-effect (eager ThemeService construction)
  private readonly _theme = inject(ThemeService);
}
