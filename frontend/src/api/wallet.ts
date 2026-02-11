import { apiFetch } from "@/api/client";

export type CreditPack = {
  id: number;
  name: string;
  credits: number;
  price_ars: string;       
  mp_title?: string;
  mp_description?: string;
};

export type CreditPackResponse = {
  resultados: CreditPack[];
};

export type WalletCheckoutResponse = {
  ok: boolean;
  topup_id: number;
  checkout_url: string;
  amount_ars: string;
  credits: number;
  error?: string;
};

export async function fetchCreditPacks() {
  return apiFetch<{ resultados: CreditPack[] }>("/api/credit-packs", {
    method: "GET",
  });
}

export async function createWalletCheckout(pack_id: number) {
  return apiFetch<{
    ok: boolean;
    topup_id: number;
    checkout_url: string;
    amount_ars: string;
    credits: number;
  }>("/api/me/wallet/checkout", {
    method: "POST",
    body: JSON.stringify({ pack_id }),
  });
}