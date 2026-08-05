import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';

@Component({
  selector:
    'app-admin-module-placeholder',
  standalone: true,
  imports: [
    RouterLink,
  ],
  templateUrl:
    './admin-module-placeholder.html',
  styleUrl:
    './admin-module-placeholder.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminModulePlaceholder {
  private readonly route =
    inject(ActivatedRoute);

  readonly pageTitle =
    computed(() =>
      String(
        this.route.snapshot.data[
          'pageTitle'
        ] ??
        'Módulo administrativo',
      ),
    );

  readonly pageDescription =
    computed(() =>
      String(
        this.route.snapshot.data[
          'pageDescription'
        ] ??
        'Este módulo se encuentra en construcción.',
      ),
    );

  readonly pageIcon =
    computed(() =>
      String(
        this.route.snapshot.data[
          'pageIcon'
        ] ??
        'pi pi-cog',
      ),
    );

  readonly section =
    computed(() =>
      String(
        this.route.snapshot.data[
          'section'
        ] ??
        'Administración',
      ),
    );
}
