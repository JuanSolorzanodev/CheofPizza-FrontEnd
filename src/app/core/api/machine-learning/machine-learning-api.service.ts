import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';

import {
  environment,
} from '../../../../environments/environment';

import {
  ActivateTrainingRunResult,
  ApiPaginatedResponse,
  ApiResponse,
  GenerateForecastPayload,
  MachineLearningRemoteModel,
  MachineLearningRun,
  MachineLearningTrainingRun,
  ModelRegistry,
  RollbackTrainingModelResult,
  TrainingDatasetOptions,
  TrainingPreviewResult,
} from './machine-learning.models';

@Injectable({
  providedIn: 'root',
})
export class MachineLearningApiService {
  private readonly http =
    inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(
      /\/$/,
      '',
    );

  private readonly base =
    `${this.apiBase}/v1/admin/machine-learning`;

  private readonly trainingBase =
    `${this.base}/training`;

  /*
  |--------------------------------------------------------------------------
  | Pronósticos
  |--------------------------------------------------------------------------
  */

  latest() {
    return this.http.get<
      ApiResponse<MachineLearningRun | null>
    >(
      `${this.base}/latest`,
    );
  }

  history(
    page = 1,
    perPage = 15,
  ) {
    const params =
      new HttpParams()
        .set(
          'page',
          page,
        )
        .set(
          'per_page',
          perPage,
        );

    return this.http.get<
      ApiPaginatedResponse<MachineLearningRun>
    >(
      `${this.base}/history`,
      {
        params,
      },
    );
  }

  show(
    uuid: string,
  ) {
    return this.http.get<
      ApiResponse<MachineLearningRun>
    >(
      `${this.base}/runs/${encodeURIComponent(
        uuid,
      )}`,
    );
  }

  remoteModel() {
    return this.http.get<
      ApiResponse<MachineLearningRemoteModel>
    >(
      `${this.base}/service/model`,
    );
  }

  preview(
    payload: GenerateForecastPayload,
  ) {
    return this.http.post<
      ApiResponse<unknown>
    >(
      `${this.base}/preview`,
      payload,
    );
  }

  generate(
    payload: GenerateForecastPayload,
  ) {
    return this.http.post<
      ApiResponse<MachineLearningRun>
    >(
      `${this.base}/generate`,
      payload,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Registro de modelos
  |--------------------------------------------------------------------------
  */

  trainingRegistry() {
    return this.http.get<
      ApiResponse<ModelRegistry>
    >(
      `${this.trainingBase}/registry`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Preview y construcción de candidatos
  |--------------------------------------------------------------------------
  */

  previewTraining(
    payload: TrainingDatasetOptions = {},
  ) {
    return this.http.post<
      ApiResponse<TrainingPreviewResult>
    >(
      `${this.trainingBase}/preview`,
      this.normalizeTrainingOptions(
        payload,
      ),
    );
  }

  buildTrainingCandidate(
    payload: TrainingDatasetOptions = {},
  ) {
    return this.http.post<
      ApiResponse<MachineLearningTrainingRun>
    >(
      `${this.trainingBase}/build`,
      this.normalizeTrainingOptions(
        payload,
      ),
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Historial de entrenamientos
  |--------------------------------------------------------------------------
  */

  trainingRuns(
    page = 1,
    perPage = 15,
  ) {
    const params =
      new HttpParams()
        .set(
          'page',
          page,
        )
        .set(
          'per_page',
          perPage,
        );

    return this.http.get<
      ApiPaginatedResponse<MachineLearningTrainingRun>
    >(
      `${this.trainingBase}/runs`,
      {
        params,
      },
    );
  }

  trainingRun(
    uuid: string,
  ) {
    return this.http.get<
      ApiResponse<MachineLearningTrainingRun>
    >(
      `${this.trainingBase}/runs/${encodeURIComponent(
        uuid,
      )}`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Activación y rollback
  |--------------------------------------------------------------------------
  */

  activateTrainingRun(
    uuid: string,
  ) {
    return this.http.post<
      ApiResponse<ActivateTrainingRunResult>
    >(
      `${
        this.trainingBase
      }/runs/${encodeURIComponent(
        uuid,
      )}/activate`,
      {},
    );
  }

  rollbackTrainingModel() {
    return this.http.post<
      ApiResponse<RollbackTrainingModelResult>
    >(
      `${this.trainingBase}/rollback`,
      {},
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalización
  |--------------------------------------------------------------------------
  */

  private normalizeTrainingOptions(
    payload: TrainingDatasetOptions,
  ): TrainingDatasetOptions {
    const normalized: TrainingDatasetOptions = {
      limit:
        this.normalizeLimit(
          payload.limit,
        ),

      include_empty_days:
        payload.include_empty_days ??
        true,
    };

    const dateFrom =
      this.normalizeOptionalText(
        payload.date_from,
      );

    const dateTo =
      this.normalizeOptionalText(
        payload.date_to,
      );

    if (dateFrom !== null) {
      normalized.date_from =
        dateFrom;
    }

    if (dateTo !== null) {
      normalized.date_to =
        dateTo;
    }

    return normalized;
  }

  private normalizeLimit(
    value: number | undefined,
  ): number {
    if (
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return 365;
    }

    return Math.min(
      1000,
      Math.max(
        1,
        Math.trunc(value),
      ),
    );
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (
      typeof value !== 'string'
    ) {
      return null;
    }

    const normalized =
      value.trim();

    return normalized === ''
      ? null
      : normalized;
  }
}
