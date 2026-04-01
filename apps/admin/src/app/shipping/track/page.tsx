import { ShippingPublicTrackingWorkspace } from '../../../components/shipping-public-tracking-workspace';

export const dynamic = 'force-dynamic';

export default async function ShippingTrackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) || {};
  const rawQuery = resolved.query || resolved.q || resolved.ref;
  const initialQuery = Array.isArray(rawQuery) ? rawQuery[0] || '' : rawQuery || '';
  const embedded = resolved.embed === '1';
  return <ShippingPublicTrackingWorkspace initialQuery={initialQuery} embedded={embedded} />;
}
