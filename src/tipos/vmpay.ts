/** Tipos públicos da API VMPay (compartilhados entre client e server). */

export interface ClienteVmpay {
  id: number;
  name: string;
}

export interface LocalVmpay {
  id: number;
  client_id: number;
  name: string;
  phone?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  country?: string | null;
  state?: string | null;
  zip_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
