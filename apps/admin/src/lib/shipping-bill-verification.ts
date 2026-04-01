export type ShippingBillVerificationPayload = {
  blNumber: string;
  carrierBlNumber: string;
  bookingReference: string;
  shipper: string;
  consignee: string;
  hsCode: string;
  lcNumber: string;
  issueDate: string;
  signedBy: string;
};

function normalize(value: string | number | null | undefined) {
  return String(value || '').trim();
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildBillSignature(payload: ShippingBillVerificationPayload) {
  const serial = [
    normalize(payload.blNumber).toUpperCase(),
    normalize(payload.carrierBlNumber).toUpperCase(),
    normalize(payload.bookingReference).toUpperCase(),
    normalize(payload.shipper),
    normalize(payload.consignee),
    normalize(payload.hsCode).toUpperCase(),
    normalize(payload.lcNumber).toUpperCase(),
    normalize(payload.issueDate),
    normalize(payload.signedBy).toLowerCase(),
  ].join('|');
  return hashString(serial);
}

export function buildBillVerifyHref(
  payload: ShippingBillVerificationPayload,
  options?: {
    origin?: string;
  },
) {
  const search = new URLSearchParams({
    blNumber: normalize(payload.blNumber),
    carrierBl: normalize(payload.carrierBlNumber),
    shipmentId: normalize(payload.bookingReference),
    signedBy: normalize(payload.signedBy),
    signedAt: normalize(payload.issueDate),
    hash: buildBillSignature(payload),
  });
  const path = `/shipping/bills-of-lading/verify?${search.toString()}`;
  return options?.origin ? `${options.origin}${path}` : path;
}
