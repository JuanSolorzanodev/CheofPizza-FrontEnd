import { CommonModule } from '@angular/common';
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
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import * as L from 'leaflet';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { GeoApiService } from '../../../core/api/geo/geo-api.service';

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
  imports: [CommonModule, ButtonModule, InputTextModule],
  templateUrl: './location-picker.html',
  styleUrl: './location-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationPicker),
      multi: true,
    },
  ],
})
export class LocationPicker implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private readonly geoApi = inject(GeoApiService);

  // Signals UI
  readonly reference = signal<string>('');
  readonly formattedAddress = signal<string | null>(null);
  readonly placeId = signal<string | null>(null);

  readonly locating = signal(false);
  readonly resolvingAddress = signal(false);
  readonly accuracyMeters = signal<number | null>(null);

  // Estado CVA
  private value: DeliveryLocationValue | null = null;
  private isDisabled = false;

  private map!: L.Map;
  private marker: L.Marker | null = null;

  private lastReverseKey: string | null = null;
  private geoWatchId: number | null = null;

  private onChange: (v: DeliveryLocationValue | null) => void = () => {};
  private onTouched: () => void = () => {};

  // Constantes UX
  private readonly DEFAULT_CENTER: [number, number] = [-0.95, -80.733]; // Manta
  private readonly DEFAULT_ZOOM = 14;

  readonly hasValue = computed(() => !!this.value && this.isValidCoords(this.value));

  readonly precisionLabel = computed(() => {
    const a = this.accuracyMeters();
    if (a == null) return null;
    const m = Math.round(a);
    if (m <= 50) return `Precisión alta (± ${m} m)`;
    if (m <= 200) return `Precisión media (± ${m} m)`;
    return `Precisión baja (± ${m} m)`;
  });

  ngAfterViewInit(): void {
    // Leaflet icons (no /media/)
    (L.Icon.Default as any).imagePath = '';
    const base = '/assets/leaflet/';
    (L.Icon.Default as any).mergeOptions({
      iconRetinaUrl: base + 'marker-icon-2x.png',
      iconUrl: base + 'marker-icon.png',
      shadowUrl: base + 'marker-shadow.png',
    });

    this.initMap();
  }

  ngOnDestroy(): void {
    this.stopGeolocationWatch();
    if (this.map) this.map.remove();
  }

  // -----------------------------
  // ControlValueAccessor
  // -----------------------------
  writeValue(obj: DeliveryLocationValue | null): void {
    this.value = obj;

    this.reference.set(obj?.reference ?? '');
    this.formattedAddress.set(obj?.formatted_address ?? null);
    this.placeId.set(obj?.place_id ?? null);

    if (!this.map) return;

    if (obj && this.isValidCoords(obj)) {
      this.setMarker(obj.lat, obj.lng, true);
      this.map.setView([obj.lat, obj.lng], 16);
    } else {
      this.clearMarker();
      this.map.setView(this.DEFAULT_CENTER, this.DEFAULT_ZOOM);
    }
  }

  registerOnChange(fn: (v: DeliveryLocationValue | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (!this.map) return;

    if (isDisabled) {
      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();
      this.map.doubleClickZoom.disable();
      this.map.boxZoom.disable();
      this.map.keyboard.disable();
      if ((this.map as any).tap) (this.map as any).tap.disable();
      // también corta geolocalización si se deshabilita
      this.stopGeolocationWatch();
    } else {
      this.map.dragging.enable();
      this.map.scrollWheelZoom.enable();
      this.map.doubleClickZoom.enable();
      this.map.boxZoom.enable();
      this.map.keyboard.enable();
      if ((this.map as any).tap) (this.map as any).tap.enable();
    }
  }

  get disabled(): boolean {
    return this.isDisabled;
  }

  // -----------------------------
  // Acciones UI
  // -----------------------------
  useMyLocation(): void {
    if (this.isDisabled) return;
    if (!navigator.geolocation) return;

    // ✅ reinicia estado SIEMPRE
    this.stopGeolocationWatch();
    this.locating.set(true);
    this.accuracyMeters.set(null);

    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        this.accuracyMeters.set(accuracy ?? null);

        // poner pin + centrar
        this.setPin(latitude, longitude);

        // ✅ No dejes el watch vivo (evita que "Obteniendo..." se quede pegado)
        this.stopGeolocationWatch();
      },
      () => {
        // Fallback: intento único
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            this.accuracyMeters.set(accuracy ?? null);
            this.setPin(latitude, longitude);
            this.locating.set(false);
          },
          () => {
            this.locating.set(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    // ✅ “failsafe”: si por alguna razón no llega callback, libera el estado
    window.setTimeout(() => {
      if (this.locating()) {
        this.stopGeolocationWatch();
      }
    }, 9000);
  }

  clear(): void {
    if (this.isDisabled) return;

    // ✅ IMPORTANTÍSIMO: cortar watch y resetear estados
    this.stopGeolocationWatch();

    this.value = null;
    this.reference.set('');
    this.formattedAddress.set(null);
    this.placeId.set(null);
    this.accuracyMeters.set(null);
    this.lastReverseKey = null;

    this.clearMarker();
    this.onTouched();
    this.onChange(null);

    // Re-centrar “zona”
    this.map.setView(this.DEFAULT_CENTER, this.DEFAULT_ZOOM);
  }

  onReferenceInput(v: string): void {
    if (this.isDisabled) return;

    this.reference.set(v);

    if (!this.value) return;

    const updated: DeliveryLocationValue = {
      ...this.value,
      reference: this.normalizeText(this.reference()),
    };

    this.value = updated;
    this.onTouched();
    this.onChange(updated);
  }

  // -----------------------------
  // Mapa
  // -----------------------------
  private initMap(): void {
    // ✅ SIN attribution control en el mapa (lo ponemos en footer)
    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: false,
    }).setView(this.DEFAULT_CENTER, this.DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    // Click para seleccionar pin
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isDisabled) return;
      this.setPin(e.latlng.lat, e.latlng.lng);
    });

    if (this.isDisabled) this.setDisabledState(true);

    // Si ya había value (edit), lo pinta
    if (this.value && this.isValidCoords(this.value)) {
      this.setMarker(this.value.lat, this.value.lng, true);
      this.map.setView([this.value.lat, this.value.lng], 16);
    }
  }

  private setPin(lat: number, lng: number): void {
    this.setMarker(lat, lng, true);
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 16));

    const v = this.buildValue(lat, lng);
    this.emit(v);
  }

  private setMarker(lat: number, lng: number, draggable: boolean): void {
    if (!this.marker) {
      this.marker = L.marker([lat, lng], { draggable }).addTo(this.map);

      this.marker.on('dragend', () => {
        if (this.isDisabled) return;
        const p = this.marker?.getLatLng();
        if (!p) return;
        this.setPin(p.lat, p.lng);
      });
    } else {
      this.marker.setLatLng([lat, lng]);
      if ((this.marker as any).dragging) {
        if (draggable && !this.isDisabled) (this.marker as any).dragging.enable();
        else (this.marker as any).dragging.disable();
      }
    }
  }

  private clearMarker(): void {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  private buildValue(lat: number, lng: number): DeliveryLocationValue {
    return {
      lat,
      lng,
      maps_url: `https://www.google.com/maps?q=${lat},${lng}`,
      place_id: this.placeId(),
      formatted_address: this.formattedAddress(),
      reference: this.normalizeText(this.reference()),
    };
  }

  private emit(v: DeliveryLocationValue): void {
    this.value = v;
    this.onTouched();
    this.onChange(v);

    // reverse geocode (async)
    this.resolveFormattedAddress(v);
  }

  private resolveFormattedAddress(v: DeliveryLocationValue): void {
    if (this.isDisabled) return;
    if (!this.isValidCoords(v)) return;

    const key = `${v.lat.toFixed(5)}:${v.lng.toFixed(5)}`;
    if (this.lastReverseKey === key) return;
    this.lastReverseKey = key;

    this.resolvingAddress.set(true);

    this.geoApi
      .reverse(v.lat, v.lng)
      .pipe(finalize(() => this.resolvingAddress.set(false)))
      .subscribe({
        next: (res) => {
          const formatted = res.data.formatted_address ?? null;
          const placeId = res.data.place_id ?? null;

          // Si el usuario ya se movió a otro punto, no sobreescribir
          if (!this.value) return;
          const currentKey = `${this.value.lat.toFixed(5)}:${this.value.lng.toFixed(5)}`;
          if (currentKey !== key) return;

          this.formattedAddress.set(formatted);
          this.placeId.set(placeId);

          const updated: DeliveryLocationValue = {
            ...this.value,
            formatted_address: formatted,
            place_id: placeId,
          };

          this.value = updated;
          this.onChange(updated);
        },
        error: () => {
          // silencioso
        },
      });
  }

  private stopGeolocationWatch(): void {
    if (this.geoWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
    this.locating.set(false);
  }

  private normalizeText(v: string): string | null {
    const t = (v ?? '').trim();
    return t.length ? t : null;
  }

  private isValidCoords(v: { lat: number; lng: number }): boolean {
    return typeof v.lat === 'number' && typeof v.lng === 'number';
  }
}
