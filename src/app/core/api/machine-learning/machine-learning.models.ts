export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/*
|--------------------------------------------------------------------------
| Modelo remoto utilizado para pronósticos
|--------------------------------------------------------------------------
*/

export interface MachineLearningModelMetric {
  target: string;
  algorithm: string;
  selection_score: number;
  mae: number;
  rmse: number;
  smape: number;
  r2: number;
  cv_mae: number;
  cv_rmse: number;
}

export interface MachineLearningRemoteModel {
  type: string;
  version: string;
  trained_from: string;
  trained_until: string;
  training_records: number;
  features: string[];
  metrics: MachineLearningModelMetric[];
}

export interface ForecastModelInfo {
  algorithm: string;
  target: string;
  version: string;
  is_active: boolean;
  activated_at: string | null;
}

export interface ForecastTrainingInfo {
  from: string;
  until: string;
  records: number;
}

export interface ForecastPeriod {
  days: number;
  from: string;
  until: string;
  generated_at: string;
}

export interface ForecastMetrics {
  selection_score: string | number | null;
  mae: string | number | null;
  rmse: string | number | null;
  smape: string | number | null;
  r2: string | number | null;
  cv_mae: string | number | null;
  cv_rmse: string | number | null;
}

export interface ForecastModelResult {
  name: string;
  selection_score: number | null;
  test_mae: number | null;
  test_rmse: number | null;
  test_smape: number | null;
  test_r2: number | null;
  cv_mae: number | null;
  cv_rmse: number | null;
}

export interface ForecastSummary {
  forecast_total_units: number;
  forecast_daily_average: number;
  highest_demand_date: string;
  highest_demand_day: string;
  highest_demand_units: number;
  highest_demand_size: string;
  historical_total_units: number | null;
}

export interface ForecastSizes {
  mini: number;
  small: number;
  medium: number;
  family: number;
  giant: number;
}

export interface ForecastCommercialBreakdown {
  basic: number;
  special: number;
  estimated_promotions: number;
  estimated_regular: number;
  available: boolean;
}

export interface ForecastInterval {
  lower_bound: number | null;
  upper_bound: number | null;
  confidence_score: number | null;
}

export interface ForecastPrediction {
  id: number;
  date: string;
  day_of_week: string;
  total_units: number;
  sizes: ForecastSizes;
  commercial_breakdown: ForecastCommercialBreakdown;
  interval: ForecastInterval;
  metadata: Record<string, unknown>;
}

export interface ForecastCreator {
  id: number;
  name: string;
  email: string;
}

export interface ForecastLimitations {
  scope: string;
  flavor_prediction_available: boolean;
  hourly_prediction_available: boolean;
  message: string;
}

export interface MachineLearningRun {
  id: number;
  uuid: string;
  source: 'ml_service' | 'google_colab' | string;
  status: string;

  model: ForecastModelInfo;
  training: ForecastTrainingInfo;
  forecast: ForecastPeriod;
  metrics: ForecastMetrics;

  all_models: Record<string, ForecastModelResult>;

  summary: ForecastSummary;
  recommendations: string[];
  limitations: ForecastLimitations;

  predictions?: ForecastPrediction[];

  created_by: ForecastCreator | null;
  created_at: string;
}

export interface GenerateForecastPayload {
  start_date: string;
  days: number;
}

/*
|--------------------------------------------------------------------------
| Opciones del dataset de entrenamiento
|--------------------------------------------------------------------------
*/

export interface TrainingDatasetOptions {
  date_from?: string | null;
  date_to?: string | null;
  limit?: number;
  include_empty_days?: boolean;
}

/*
|--------------------------------------------------------------------------
| Registro persistente del modelo activo
|--------------------------------------------------------------------------
*/

export type ModelRegistryKind =
  | 'legacy'
  | 'historical';

export interface ModelRegistryReference {
  kind: ModelRegistryKind;
  artifact_id: string;
  version: string;
  activated_at: string;
}

export interface ModelRegistry {
  registry_version: '1.0' | string;
  active: ModelRegistryReference;
  rollback_available: boolean;
  rollback_depth: number;
  history: ModelRegistryReference[];
  updated_at: string;
}

export interface ModelActivationRegistry {
  activated: boolean;
  previous: ModelRegistryReference;
  active: ModelRegistryReference;
  rollback_available: boolean;
  message: string;
}

export interface ModelRollbackRegistry {
  rolled_back: boolean;
  previous: ModelRegistryReference;
  active: ModelRegistryReference;
  rollback_available: boolean;
  message: string;
}

/*
|--------------------------------------------------------------------------
| Madurez y resumen del dataset
|--------------------------------------------------------------------------
*/

export type TrainingMaturityStatus =
  | 'collecting'
  | 'experimental'
  | 'operational'
  | string;

export type TrainingMaturityConfidence =
  | 'insufficient'
  | 'experimental'
  | 'operational'
  | string;

export interface TrainingDatasetMaturity {
  status: TrainingMaturityStatus;
  label: string;
  confidence: TrainingMaturityConfidence;

  collected_days: number;
  active_days: number;

  first_date: string | null;
  last_date: string | null;

  minimum_training_days: number;
  recommended_training_days: number;

  can_train_experimental: boolean;
  can_train_operational: boolean;
}

export interface TrainingDatasetSummary {
  records: number;
  active_days: number;
  empty_days: number;

  total_delivered_orders: number;
  total_cancelled_orders: number;
  total_pizzas_sold: number;
  total_net_sales: number;
}

export interface TrainingDatasetOverview {
  schema_version: string;
  generated_at: string;
  timezone: string;
  maturity: TrainingDatasetMaturity;
  summary: TrainingDatasetSummary;
}

/*
|--------------------------------------------------------------------------
| Preview de entrenamiento
|--------------------------------------------------------------------------
*/

export interface TrainingCandidateMetric {
  algorithm: string;
  algorithm_label: string;

  mean_mae: number;
  mean_rmse: number;

  mean_smape?: number | null;
  mean_r2?: number | null;

  metrics?: MachineLearningModelMetric[];
}

export interface TrainingWinner {
  algorithm: string;
  algorithm_label: string;
  mean_mae: number;
  mean_rmse: number;
  mean_smape?: number | null;
  mean_r2?: number | null;
}

export interface TrainingPreview {
  trained: boolean;
  schema_version: string;

  received_records: number;
  usable_records: number;
  training_records: number;
  validation_records: number;

  first_date: string | null;
  last_date: string | null;

  folds: number;

  targets: string[];
  derived_targets: string[];
  features: string[];

  winner: TrainingWinner | null;
  candidates: TrainingCandidateMetric[];

  warnings: string[];
  message: string;
}

export interface TrainingPreviewResult {
  dataset: TrainingDatasetOverview;
  preview: TrainingPreview;
}

/*
|--------------------------------------------------------------------------
| Ejecuciones persistidas de entrenamiento
|--------------------------------------------------------------------------
*/

export type TrainingRunStatus =
  | 'processing'
  | 'built'
  | 'activated'
  | 'rolled_back'
  | 'failed'
  | string;

export interface TrainingArtifactInformation {
  id: string | null;
  version: string | null;
  algorithm: string | null;
  algorithm_label: string | null;
  is_active: boolean;
}

export interface TrainingRunPeriod {
  schema_version: string;
  from: string | null;
  until: string | null;
  received_records: number;
  usable_records: number;
}

export interface TrainingRunMetrics {
  mean_mae: string | number | null;
  mean_rmse: string | number | null;
  targets: unknown[] | Record<string, unknown> | null;
}

export interface TrainingRunContract {
  targets: string[] | null;
  derived_targets: string[] | null;
  features: string[] | null;
}

export interface TrainingRunError {
  message: string | null;
  remote_status: number | null;
}

export interface TrainingRunTimestamps {
  built_at: string | null;
  activated_at: string | null;
  rolled_back_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TrainingRunCreator {
  id: number;
  name: string;
  email: string;
}

export interface MachineLearningTrainingRun {
  id: number;
  uuid: string;
  status: TrainingRunStatus;
  dataset_hash: string;

  artifact: TrainingArtifactInformation;
  training: TrainingRunPeriod;
  metrics: TrainingRunMetrics;
  contract: TrainingRunContract;

  dataset_summary: TrainingDatasetSummary | null;
  request_options: TrainingDatasetOptions | null;

  warnings: string[] | null;
  error: TrainingRunError | null;

  timestamps: TrainingRunTimestamps;
  created_by: TrainingRunCreator | null;
}

/*
|--------------------------------------------------------------------------
| Respuestas de activación y rollback
|--------------------------------------------------------------------------
*/

export interface ActivateTrainingRunResult {
  registry: ModelActivationRegistry;
  training_run: MachineLearningTrainingRun;
}

export interface RollbackTrainingModelResult {
  registry: ModelRollbackRegistry;
  training_run: MachineLearningTrainingRun | null;
}
