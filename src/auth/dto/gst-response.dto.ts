// src/modules/auth/dto/gst-response.interface.ts
export interface GstAddress {
  dst: string;
  loc: string;
  city: string;
  stcd: string;
  flno: string;
  lg: string;
  st: string;
  pncd: string;
  bno: string;
  bnm: string;
  lt: string;
}

export interface PrincipalAddress {
  ntr: string;
  addr: GstAddress;
}

export interface GstData {
  nba: string[];
  sts: string;
  rgdt: string;
  errorMsg: string | null;
  lstupdt: string;
  ctj: string;
  frequencyType: string;
  ctb: string;
  gstin: string;
  stjCd: string;
  ctjCd: string;
  dty: string;
  tradeNam: string;
  pradr: PrincipalAddress;
  adadr: any[];
  lgnm: string;
  stj: string;
  cxdt: string;
}

export interface GstApiResponse {
  flag: boolean;
  message: string;
  data: GstData | null;
}