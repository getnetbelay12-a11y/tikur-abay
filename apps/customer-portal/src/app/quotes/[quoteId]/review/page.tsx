import { cookies } from 'next/headers';
import { PortalFrame } from '../../../../components/portal-frame';
import { QuoteReviewWorkspace } from '../../../../components/quote-review-workspace';

export default async function QuoteReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams?: Promise<{ localQuote?: string; format?: string }>;
}) {
  const { quoteId } = await params;
  const decodedQuoteId = decodeURIComponent(quoteId);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const rawSharedCollection = cookieStore.get('tikur_abay_quote_reviews')?.value;
  let initialQuote = null;

  if (rawSharedCollection) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawSharedCollection));
      if (Array.isArray(parsed)) {
        initialQuote = parsed.find((item) => item?.quoteId === decodedQuoteId) ?? null;
      }
    } catch {
      initialQuote = null;
    }
  }

  if (!initialQuote && resolvedSearchParams?.localQuote) {
    try {
      initialQuote = JSON.parse(decodeURIComponent(resolvedSearchParams.localQuote));
    } catch {
      initialQuote = null;
    }
  }

  if (resolvedSearchParams?.format === 'pdf') {
    return <QuoteReviewWorkspace quoteId={decodedQuoteId} initialQuote={initialQuote} pdfMode />;
  }

  return (
    <PortalFrame
      currentPath="/bookings"
      title="Quote Review"
      subtitle="Review your shipment quote, approve it, or request a revision."
    >
      <QuoteReviewWorkspace quoteId={decodedQuoteId} initialQuote={initialQuote} />
    </PortalFrame>
  );
}
