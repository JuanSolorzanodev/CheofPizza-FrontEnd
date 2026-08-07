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
  MachineLearningComparison,
  MachineLearningComparisonParams,
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

  /**
   * Obtiene el último pronóstico activo importado en Laravel.
   */
  latest() {
    return this.http.get<
      ApiResponse<MachineLearningRun | null>
    >(
      `${this.base}/latest`,
    );
  }

  /**
   * Compara las predicciones del modelo activo con las ventas
   * reales consolidadas dentro del periodo seleccionado.
   */
  comparison(
    payload: MachineLearningComparisonParams,
  ) {
    const params =
      new HttpParams()
        .set(
          'date_from',
          payload.date_from,
        )
        .set(
          'date_to',
          payload.date_to,
        );

    return this.http.get<
      ApiResponse<MachineLearningComparison>
    >(
      `${this.base}/comparison`,
      {
        params,
      },
    );
  }

  /**
   * Obtiene el historial paginado de pronósticos.
   */
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

  /**
   * Obtiene una ejecución específica por UUID.
   */
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

  /**
   * Consulta la información del modelo activo directamente
   * desde el microservicio de Machine Learning.
   */
  remoteModel() {
    return this.http.get<
      ApiResponse<MachineLearningRemoteModel>
    >(
      `${this.base}/service/model`,
    );
  }

  /**
   * Solicita una vista previa de pronóstico sin persistirla.
   */
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

  /**
   * Genera, importa y persiste un nuevo pronóstico.
   */
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

  /**
   * Obtiene el registro del modelo activo y el historial
   * disponible para rollback.
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

  /**
   * Analiza el dataset disponible y devuelve una vista previa
   * del proceso de entrenamiento sin crear un artefacto.
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

  /**
   * Construye y persiste un modelo candidato utilizando
   * el dataset consolidado por Laravel.
   */
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

  /**
   * Obtiene el historial paginado de entrenamientos.
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

  /**
   * Obtiene una ejecución de entrenamiento por UUID.
   */
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

  /**
   * Activa un modelo candidato construido previamente.
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

  /**
   * Revierte el modelo activo al artefacto anterior disponible
   * en el registro.
   */
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

  /**
   * Normaliza las opciones enviadas al backend para evitar
   * valores vacíos, límites inválidos o fechas con espacios.
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

    if (
      dateFrom !== null
    ) {
      normalized.date_from =
        dateFrom;
    }

    if (
      dateTo !== null
    ) {
      normalized.date_to =
        dateTo;
    }

    return normalized;
  }

  /**
   * Mantiene el límite del dataset dentro del rango permitido
   * por el backend.
   */
  private normalizeLimit(
    value: number | undefined,
  ): number {
    if (
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      return 365;
    }

    return Math.min(
      1000,
      Math.max(
        1,
        Math.trunc(
          value,
        ),
      ),
    );
  }

  /**
   * Convierte textos vacíos en null y elimina espacios
   * innecesarios.
   */
  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (
      typeof value !==
      'string'
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
