import {
  CommonModule,
  DOCUMENT,
} from '@angular/common';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

import * as L from 'leaflet';

import {
  finalize,
} from 'rxjs';

import {
  ButtonModule,
} from 'primeng/button';

import {
  InputTextModule,
} from 'primeng/inputtext';

import {
  GeoApiService,
} from '../../../core/api/geo/geo-api.service';

export interface DeliveryLocationValue {
  lat: number;
  lng: number;
  maps_url?: string | null;
  place_id?: string | null;
  formatted_address?: string | null;
  reference?: string | null;
}

@Component({
  selector: 'app-location-picker',

  standalone: true,

  imports: [
    CommonModule,
    ButtonModule,
    InputTextModule,
  ],

  templateUrl:
    './location-picker.html',

  styleUrl:
    './location-picker.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,

  providers: [
    {
      provide:
        NG_VALUE_ACCESSOR,

      useExisting:
        forwardRef(
          () => LocationPicker,
        ),

      multi: true,
    },
  ],
})
export class LocationPicker
  implements
    AfterViewInit,
    OnDestroy,
    ControlValueAccessor
{
  @ViewChild(
    'map',
    {
      static: true,
    },
  )
  mapEl!: ElementRef<HTMLDivElement>;

  private readonly document =
    inject(DOCUMENT);

  private readonly geoApi =
    inject(GeoApiService);

  /**
   * Identificador utilizado para impedir que
   * Leaflet CSS sea agregado varias veces al DOM.
   */
  private readonly leafletStylesheetId =
    'cheof-leaflet-styles';

  /**
   * Archivo de Leaflet copiado dentro de:
   *
   * src/assets/leaflet/leaflet.css
   */
  private readonly leafletStylesheetUrl =
    '/assets/leaflet/leaflet.css';

  /**
   * Base de los iconos estándar de Leaflet.
   */
  private readonly leafletAssetsBase =
    '/assets/leaflet/';

  // ========================================================
  // ESTADO UI
  // ========================================================

  readonly reference =
    signal<string>('');

  readonly formattedAddress =
    signal<string | null>(
      null,
    );

  readonly placeId =
    signal<string | null>(
      null,
    );

  readonly locating =
    signal(false);

  readonly resolvingAddress =
    signal(false);

  readonly accuracyMeters =
    signal<number | null>(
      null,
    );

  // ========================================================
  // ESTADO CONTROL VALUE ACCESSOR
  // ========================================================

  private value:
    DeliveryLocationValue | null =
    null;

  private isDisabled =
    false;

  private onChange: (
    value:
      DeliveryLocationValue | null,
  ) => void = () => undefined;

  private onTouched:
    () => void =
    () => undefined;

  // ========================================================
  // ESTADO DEL MAPA
  // ========================================================

  private map!: L.Map;

  private marker:
    L.Marker | null =
    null;

  private lastReverseKey:
    string | null =
    null;

  private geoWatchId:
    number | null =
    null;

  // ========================================================
  // CONFIGURACIÓN UX
  // ========================================================

  private readonly DEFAULT_CENTER:
    [number, number] = [
      -0.95,
      -80.733,
    ];

  private readonly DEFAULT_ZOOM =
    14;

  // ========================================================
  // ESTADO DERIVADO
  // ========================================================

  readonly hasValue =
    computed(
      () =>
        !!this.value &&
        this.isValidCoords(
          this.value,
        ),
    );

  readonly precisionLabel =
    computed(() => {
      const accuracy =
        this.accuracyMeters();

      if (
        accuracy == null
      ) {
        return null;
      }

      const meters =
        Math.round(
          accuracy,
        );

      if (
        meters <= 50
      ) {
        return (
          `Precisión alta ` +
          `(± ${meters} m)`
        );
      }

      if (
        meters <= 200
      ) {
        return (
          `Precisión media ` +
          `(± ${meters} m)`
        );
      }

      return (
        `Precisión baja ` +
        `(± ${meters} m)`
      );
    });

  // ========================================================
  // CICLO DE VIDA
  // ========================================================

  ngAfterViewInit(): void {
    /**
     * Leaflet solo se utiliza cuando aparece
     * LocationPicker.
     *
     * Por eso su CSS se carga aquí y no desde
     * angular.json para toda la aplicación.
     */
    this.ensureLeafletStyles();

    this.configureLeafletIcons();

    this.initMap();
  }

  ngOnDestroy(): void {
    this.stopGeolocationWatch();

    if (this.map) {
      this.map.remove();
    }
  }

  // ========================================================
  // CONTROL VALUE ACCESSOR
  // ========================================================

  writeValue(
    obj:
      DeliveryLocationValue | null,
  ): void {
    this.value =
      obj;

    this.reference.set(
      obj?.reference ??
        '',
    );

    this.formattedAddress.set(
      obj?.formatted_address ??
        null,
    );

    this.placeId.set(
      obj?.place_id ??
        null,
    );

    if (!this.map) {
      return;
    }

    if (
      obj &&
      this.isValidCoords(
        obj,
      )
    ) {
      this.setMarker(
        obj.lat,
        obj.lng,
        true,
      );

      this.map.setView(
        [
          obj.lat,
          obj.lng,
        ],
        16,
      );

      return;
    }

    this.clearMarker();

    this.map.setView(
      this.DEFAULT_CENTER,
      this.DEFAULT_ZOOM,
    );
  }

  registerOnChange(
    fn: (
      value:
        DeliveryLocationValue | null,
    ) => void,
  ): void {
    this.onChange =
      fn;
  }

  registerOnTouched(
    fn: () => void,
  ): void {
    this.onTouched =
      fn;
  }

  setDisabledState(
    isDisabled: boolean,
  ): void {
    this.isDisabled =
      isDisabled;

    if (!this.map) {
      return;
    }

    if (isDisabled) {
      this.disableMapInteractions();

      this.stopGeolocationWatch();

      return;
    }

    this.enableMapInteractions();
  }

  get disabled(): boolean {
    return this.isDisabled;
  }

  // ========================================================
  // ACCIONES DE UI
  // ========================================================

  useMyLocation(): void {
    if (
      this.isDisabled ||
      !navigator.geolocation
    ) {
      return;
    }

    /**
     * Cancela cualquier búsqueda anterior
     * antes de comenzar una nueva.
     */
    this.stopGeolocationWatch();

    this.locating.set(
      true,
    );

    this.accuracyMeters.set(
      null,
    );

    this.geoWatchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const {
            latitude,
            longitude,
            accuracy,
          } =
            position.coords;

          this.accuracyMeters.set(
            accuracy ??
              null,
          );

          this.setPin(
            latitude,
            longitude,
          );

          /**
           * Solo necesitamos una ubicación
           * suficientemente precisa.
           *
           * No dejamos el watch activo
           * innecesariamente.
           */
          this.stopGeolocationWatch();
        },

        () => {
          this.resolveLocationFallback();
        },

        {
          enableHighAccuracy:
            true,

          timeout:
            20_000,

          maximumAge:
            0,
        },
      );

    /**
     * Failsafe:
     *
     * Evita que el indicador
     * "Obteniendo ubicación..."
     * permanezca activo indefinidamente
     * si el navegador no responde.
     */
    window.setTimeout(
      () => {
        if (
          this.locating()
        ) {
          this.stopGeolocationWatch();
        }
      },
      9_000,
    );
  }

  clear(): void {
    if (
      this.isDisabled
    ) {
      return;
    }

    this.stopGeolocationWatch();

    this.value =
      null;

    this.reference.set(
      '',
    );

    this.formattedAddress.set(
      null,
    );

    this.placeId.set(
      null,
    );

    this.accuracyMeters.set(
      null,
    );

    this.lastReverseKey =
      null;

    this.clearMarker();

    this.onTouched();

    this.onChange(
      null,
    );

    this.map.setView(
      this.DEFAULT_CENTER,
      this.DEFAULT_ZOOM,
    );
  }

  onReferenceInput(
    value: string,
  ): void {
    if (
      this.isDisabled
    ) {
      return;
    }

    this.reference.set(
      value,
    );

    if (!this.value) {
      return;
    }

    const updated:
      DeliveryLocationValue = {
      ...this.value,

      reference:
        this.normalizeText(
          this.reference(),
        ),
    };

    this.value =
      updated;

    this.onTouched();

    this.onChange(
      updated,
    );
  }

  // ========================================================
  // LEAFLET
  // ========================================================

  /**
   * Carga el stylesheet de Leaflet únicamente
   * cuando LocationPicker se renderiza.
   *
   * Si el usuario vuelve a Checkout durante
   * la misma sesión, el <link> existente se
   * reutiliza.
   */
  private ensureLeafletStyles(): void {
    const existingStylesheet =
      this.document.getElementById(
        this.leafletStylesheetId,
      );

    if (
      existingStylesheet
    ) {
      return;
    }

    const link =
      this.document.createElement(
        'link',
      );

    link.id =
      this.leafletStylesheetId;

    link.rel =
      'stylesheet';

    link.href =
      this.leafletStylesheetUrl;

    this.document.head.appendChild(
      link,
    );
  }

  /**
   * Leaflet normalmente intenta resolver
   * automáticamente la ubicación de sus iconos.
   *
   * Como los servimos desde assets, definimos
   * explícitamente las URLs.
   */
  private configureLeafletIcons(): void {
    (
      L.Icon.Default as unknown as {
        imagePath: string;
      }
    ).imagePath =
      '';

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        `${this.leafletAssetsBase}` +
        'marker-icon-2x.png',

      iconUrl:
        `${this.leafletAssetsBase}` +
        'marker-icon.png',

      shadowUrl:
        `${this.leafletAssetsBase}` +
        'marker-shadow.png',
    });
  }

  // ========================================================
  // MAPA
  // ========================================================

  private initMap(): void {
    /**
     * No utilizamos el attributionControl
     * predeterminado porque la atribución se
     * muestra desde la UI del componente.
     */
    this.map =
      L.map(
        this.mapEl.nativeElement,
        {
          zoomControl:
            true,

          attributionControl:
            false,
        },
      ).setView(
        this.DEFAULT_CENTER,
        this.DEFAULT_ZOOM,
      );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(
      this.map,
    );

    this.map.on(
      'click',
      (
        event:
          L.LeafletMouseEvent,
      ) => {
        if (
          this.isDisabled
        ) {
          return;
        }

        this.setPin(
          event.latlng.lat,
          event.latlng.lng,
        );
      },
    );

    if (
      this.isDisabled
    ) {
      this.setDisabledState(
        true,
      );
    }

    /**
     * Si el ControlValueAccessor recibió un
     * valor antes de inicializar Leaflet,
     * ahora podemos dibujarlo.
     */
    if (
      this.value &&
      this.isValidCoords(
        this.value,
      )
    ) {
      this.setMarker(
        this.value.lat,
        this.value.lng,
        true,
      );

      this.map.setView(
        [
          this.value.lat,
          this.value.lng,
        ],
        16,
      );
    }
  }

  private setPin(
    lat: number,
    lng: number,
  ): void {
    this.setMarker(
      lat,
      lng,
      true,
    );

    this.map.setView(
      [
        lat,
        lng,
      ],
      Math.max(
        this.map.getZoom(),
        16,
      ),
    );

    const value =
      this.buildValue(
        lat,
        lng,
      );

    this.emit(
      value,
    );
  }

  private setMarker(
    lat: number,
    lng: number,
    draggable: boolean,
  ): void {
    if (!this.marker) {
      this.marker =
        L.marker(
          [
            lat,
            lng,
          ],
          {
            draggable,
          },
        ).addTo(
          this.map,
        );

      this.marker.on(
        'dragend',
        () => {
          if (
            this.isDisabled
          ) {
            return;
          }

          const position =
            this.marker?.getLatLng();

          if (!position) {
            return;
          }

          this.setPin(
            position.lat,
            position.lng,
          );
        },
      );

      return;
    }

    this.marker.setLatLng(
      [
        lat,
        lng,
      ],
    );

    const markerDragging =
      (
        this.marker as L.Marker & {
          dragging?: {
            enable:
              () => void;

            disable:
              () => void;
          };
        }
      ).dragging;

    if (
      !markerDragging
    ) {
      return;
    }

    if (
      draggable &&
      !this.isDisabled
    ) {
      markerDragging.enable();

      return;
    }

    markerDragging.disable();
  }

  private clearMarker(): void {
    if (!this.marker) {
      return;
    }

    this.marker.remove();

    this.marker =
      null;
  }

  // ========================================================
  // VALOR DE ENTREGA
  // ========================================================

  private buildValue(
    lat: number,
    lng: number,
  ): DeliveryLocationValue {
    return {
      lat,
      lng,

      maps_url:
        `https://www.google.com/maps?` +
        `q=${lat},${lng}`,

      place_id:
        this.placeId(),

      formatted_address:
        this.formattedAddress(),

      reference:
        this.normalizeText(
          this.reference(),
        ),
    };
  }

  private emit(
    value:
      DeliveryLocationValue,
  ): void {
    this.value =
      value;

    this.onTouched();

    this.onChange(
      value,
    );

    this.resolveFormattedAddress(
      value,
    );
  }

  // ========================================================
  // REVERSE GEOCODING
  // ========================================================

  private resolveFormattedAddress(
    value:
      DeliveryLocationValue,
  ): void {
    if (
      this.isDisabled ||
      !this.isValidCoords(
        value,
      )
    ) {
      return;
    }

    const key =
      this.coordinateKey(
        value.lat,
        value.lng,
      );

    if (
      this.lastReverseKey ===
      key
    ) {
      return;
    }

    this.lastReverseKey =
      key;

    this.resolvingAddress.set(
      true,
    );

    this.geoApi
      .reverse(
        value.lat,
        value.lng,
      )
      .pipe(
        finalize(
          () =>
            this.resolvingAddress.set(
              false,
            ),
        ),
      )
      .subscribe({
        next:
          (response) => {
            const formattedAddress =
              response.data
                .formatted_address ??
              null;

            const placeId =
              response.data
                .place_id ??
              null;

            /**
             * Mientras llegaba el reverse geocode
             * el usuario pudo mover el marcador.
             *
             * En ese caso descartamos la respuesta
             * antigua.
             */
            if (!this.value) {
              return;
            }

            const currentKey =
              this.coordinateKey(
                this.value.lat,
                this.value.lng,
              );

            if (
              currentKey !==
              key
            ) {
              return;
            }

            this.formattedAddress.set(
              formattedAddress,
            );

            this.placeId.set(
              placeId,
            );

            const updated:
              DeliveryLocationValue = {
              ...this.value,

              formatted_address:
                formattedAddress,

              place_id:
                placeId,
            };

            this.value =
              updated;

            this.onChange(
              updated,
            );
          },

        /**
         * La dirección legible es información
         * complementaria.
         *
         * Si el reverse geocoding falla,
         * conservamos las coordenadas seleccionadas.
         */
        error:
          () => undefined,
      });
  }

  // ========================================================
  // GEOLOCALIZACIÓN
  // ========================================================

  private resolveLocationFallback(): void {
    if (
      !navigator.geolocation
    ) {
      this.locating.set(
        false,
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
          accuracy,
        } =
          position.coords;

        this.accuracyMeters.set(
          accuracy ??
            null,
        );

        this.setPin(
          latitude,
          longitude,
        );

        this.locating.set(
          false,
        );
      },

      () => {
        this.locating.set(
          false,
        );
      },

      {
        enableHighAccuracy:
          true,

        timeout:
          15_000,

        maximumAge:
          0,
      },
    );
  }

  private stopGeolocationWatch(): void {
    if (
      this.geoWatchId !==
        null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        this.geoWatchId,
      );

      this.geoWatchId =
        null;
    }

    this.locating.set(
      false,
    );
  }

  // ========================================================
  // INTERACCIONES DEL MAPA
  // ========================================================

  private disableMapInteractions(): void {
    this.map.dragging.disable();

    this.map.scrollWheelZoom.disable();

    this.map.doubleClickZoom.disable();

    this.map.boxZoom.disable();

    this.map.keyboard.disable();

    const tap =
      (
        this.map as L.Map & {
          tap?: {
            disable:
              () => void;
          };
        }
      ).tap;

    tap?.disable();
  }

  private enableMapInteractions(): void {
    this.map.dragging.enable();

    this.map.scrollWheelZoom.enable();

    this.map.doubleClickZoom.enable();

    this.map.boxZoom.enable();

    this.map.keyboard.enable();

    const tap =
      (
        this.map as L.Map & {
          tap?: {
            enable:
              () => void;
          };
        }
      ).tap;

    tap?.enable();
  }

  // ========================================================
  // UTILIDADES
  // ========================================================

  private coordinateKey(
    lat: number,
    lng: number,
  ): string {
    return (
      `${lat.toFixed(5)}:` +
      lng.toFixed(5)
    );
  }

  private normalizeText(
    value: string,
  ): string | null {
    const normalized =
      (
        value ??
        ''
      ).trim();

    return normalized.length
      ? normalized
      : null;
  }

  private isValidCoords(
    value: {
      lat: number;
      lng: number;
    },
  ): boolean {
    return (
      typeof value.lat ===
        'number' &&
      Number.isFinite(
        value.lat,
      ) &&
      typeof value.lng ===
        'number' &&
      Number.isFinite(
        value.lng,
      ) &&
      value.lat >= -90 &&
      value.lat <= 90 &&
      value.lng >= -180 &&
      value.lng <= 180
    );
  }
}
