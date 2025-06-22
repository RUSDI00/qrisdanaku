export interface QrisApiResponseSuccess {
  status: "success";
  nominal: string;
  link_qris: string;
  converted_qris: string;
}

export interface QrisApiResponseError {
  status: "error" | string; // API might return other error statuses
  message: string;
  // Potentially other fields the API might return on error
}

export type QrisApiResponse = QrisApiResponseSuccess | QrisApiResponseError;
