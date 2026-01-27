export interface ReverseGeoResponse {
  data: {
    formatted_address: string | null;
    place_id: string | null;
  };
}
