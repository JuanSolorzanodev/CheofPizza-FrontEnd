import {
  HttpClient,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';

import {
  environment,
} from '../../../../../environments/environment';

import {
  AdminPromotion,
  AdminPromotionPayload,
  AdminPromotionsApiResponse,
  AdminPromotionVisibilityPayload,
} from './admin-promotions.models';

@Injectable({
  providedIn: 'root',
})
export class AdminPromotionsApiService {
  private readonly http =
    inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(
      /\/$/,
      '',
    );

  private readonly base =
    `${this.apiBase}/v1/admin/promotions`;

  promotions() {
    return this.http.get<
      AdminPromotionsApiResponse<
        AdminPromotion[]
      >
    >(this.base);
  }

  promotion(
    promotionId: number,
  ) {
    return this.http.get<
      AdminPromotionsApiResponse<
        AdminPromotion
      >
    >(
      `${this.base}/${promotionId}`,
    );
  }

  createPromotion(
    payload: AdminPromotionPayload,
  ) {
    return this.http.post<
      AdminPromotionsApiResponse<
        AdminPromotion
      >
    >(
      this.base,
      payload,
    );
  }

  updatePromotion(
    promotionId: number,
    payload: AdminPromotionPayload,
  ) {
    return this.http.put<
      AdminPromotionsApiResponse<
        AdminPromotion
      >
    >(
      `${this.base}/${promotionId}`,
      payload,
    );
  }

  updateVisibility(
    promotionId: number,
    payload: AdminPromotionVisibilityPayload,
  ) {
    return this.http.patch<
      AdminPromotionsApiResponse<
        AdminPromotion
      >
    >(
      `${this.base}/${promotionId}/visibility`,
      payload,
    );
  }

  deletePromotion(
    promotionId: number,
  ) {
    return this.http.delete<
      AdminPromotionsApiResponse<null>
    >(
      `${this.base}/${promotionId}`,
    );
  }
}
