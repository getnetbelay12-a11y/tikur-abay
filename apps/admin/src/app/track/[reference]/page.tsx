import { ShippingPublicTrackingWorkspace } from '../../../components/shipping-public-tracking-workspace';

export const dynamic = 'force-dynamic';

export default async function PublicTrackingReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reference } = await params;
  const resolved = (await searchParams) || {};
  const embedded = resolved.embed === '1';
  return <ShippingPublicTrackingWorkspace initialQuery={decodeURIComponent(reference)} embedded={embedded} />;
}
