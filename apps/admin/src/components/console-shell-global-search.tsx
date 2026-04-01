'use client';

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchIcon } from './console-icons';

const globalSearchHistoryStorageKey = 'tikur-abay:global-search-history';
const globalSearchPinnedStorageKey = 'tikur-abay:global-search-pinned';

export type GlobalLocatorResult = {
  container?: {
    containerNo: string;
    bookingNo: string;
    shipmentNo: string;
    currentStatus: string;
    currentLocation: string;
    assignedDriver?: string;
    deliveredBy?: string;
    returnedBy?: string;
    returnStatus?: string;
    updatedAt?: string;
  } | null;
  events?: Array<{
    eventType: string;
    location: string;
    timestamp: string;
  }>;
};

function escapeHighlightPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWorkflowReference(value: string) {
  return String(value || '').trim().toUpperCase();
}

function isBookingWorkflowReference(value: string) {
  const normalized = normalizeWorkflowReference(value);
  return normalized.startsWith('BK-') || normalized.startsWith('TRP-') || normalized.startsWith('TRIP-');
}

function isContainerWorkflowReference(value: string) {
  const normalized = normalizeWorkflowReference(value);
  return /^[A-Z]{4}\d{6,7}$/.test(normalized);
}

function normalizeBookingWorkflowReference(value: string) {
  const normalized = normalizeWorkflowReference(value);
  if (normalized.startsWith('TRP-')) return normalized.slice(4);
  if (normalized.startsWith('TRIP-')) return normalized.slice(5);
  return normalized;
}

function deriveWorkflowSearchContext(query: string, result: GlobalLocatorResult | null) {
  const normalizedQuery = normalizeWorkflowReference(query);
  const containerNo = result?.container?.containerNo || '';
  const bookingNo = result?.container?.bookingNo || '';
  const shipmentNo = result?.container?.shipmentNo || '';

  return {
    booking: bookingNo || (isBookingWorkflowReference(normalizedQuery) ? normalizeBookingWorkflowReference(normalizedQuery) : ''),
    shipment: shipmentNo || '',
    container: containerNo || (isContainerWorkflowReference(normalizedQuery) ? normalizedQuery : ''),
  };
}

function renderHighlightedMatch(value: string | undefined, query: string) {
  const text = String(value || '');
  const needle = query.trim();
  if (!text || needle.length < 2) return text || 'Pending';
  const pattern = new RegExp(`(${escapeHighlightPattern(needle)})`, 'ig');
  const parts = text.split(pattern);
  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase()
      ? <mark key={`${part}-${index}`} className="global-search-highlight">{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>,
  );
}

const globalLocatorResultCache = new Map<string, GlobalLocatorResult>();

type ConsoleShellGlobalSearchProps = {
  isConsoleWorkspaceRoute: boolean;
  isShippingWorkspaceRoute: boolean;
  onStateChange: (state: { query: string; result: GlobalLocatorResult | null }) => void;
};

export function ConsoleShellGlobalSearch({
  isConsoleWorkspaceRoute,
  isShippingWorkspaceRoute,
  onStateChange,
}: ConsoleShellGlobalSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [globalSearchValue, setGlobalSearchValue] = useState(searchParams.get('query') || searchParams.get('q') || '');
  const deferredGlobalSearchValue = useDeferredValue(globalSearchValue);
  const [globalSearchResult, setGlobalSearchResult] = useState<GlobalLocatorResult | null>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchActionIndex, setGlobalSearchActionIndex] = useState(0);
  const [globalSearchHistory, setGlobalSearchHistory] = useState<string[]>([]);
  const [globalSearchPinned, setGlobalSearchPinned] = useState<string[]>([]);
  const globalSearchRef = useRef<HTMLDivElement | null>(null);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setGlobalSearchValue(searchParams.get('query') || searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    onStateChange({ query: deferredGlobalSearchValue, result: globalSearchResult });
  }, [deferredGlobalSearchValue, globalSearchResult, onStateChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawHistory = window.localStorage.getItem(globalSearchHistoryStorageKey);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as string[];
        if (Array.isArray(parsed)) {
          setGlobalSearchHistory(parsed.filter((item) => typeof item === 'string').slice(0, 8));
        }
      }
    } catch {}
    try {
      const rawPinned = window.localStorage.getItem(globalSearchPinnedStorageKey);
      if (rawPinned) {
        const parsed = JSON.parse(rawPinned) as string[];
        if (Array.isArray(parsed)) {
          setGlobalSearchPinned(parsed.filter((item) => typeof item === 'string').slice(0, 8));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const query = deferredGlobalSearchValue.trim();
    if (query.length < 3) {
      setGlobalSearchResult(null);
      setGlobalSearchLoading(false);
      setGlobalSearchActionIndex(0);
      return;
    }

    let cancelled = false;
    setGlobalSearchLoading(true);
    const timer = window.setTimeout(() => {
      const cached = globalLocatorResultCache.get(query);
      if (cached) {
        setGlobalSearchResult(cached);
        setGlobalSearchOpen(true);
        setGlobalSearchActionIndex(0);
        setGlobalSearchLoading(false);
        return;
      }
      void fetch(`/api/tracking?query=${encodeURIComponent(query)}`, { cache: 'no-store' })
        .then((response) => response.json() as Promise<GlobalLocatorResult>)
        .then((payload) => {
          if (cancelled) return;
          globalLocatorResultCache.set(query, payload);
          setGlobalSearchResult(payload);
          setGlobalSearchOpen(true);
          setGlobalSearchActionIndex(0);
        })
        .catch(() => {
          if (cancelled) return;
          setGlobalSearchResult(null);
        })
        .finally(() => {
          if (!cancelled) setGlobalSearchLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deferredGlobalSearchValue]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!globalSearchRef.current?.contains(event.target as Node)) {
        setGlobalSearchOpen(false);
        setGlobalSearchActionIndex(0);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = String(target?.tagName || '').toLowerCase();
      const isTypingContext =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        Boolean(target?.isContentEditable);
      if (isTypingContext) return;
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      globalSearchInputRef.current?.focus();
      setGlobalSearchOpen(Boolean(globalSearchResult?.container));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchResult?.container]);

  function setPinnedGlobalSearches(updater: (current: string[]) => string[]) {
    setGlobalSearchPinned((current) => {
      const next = updater(current).slice(0, 8);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(globalSearchPinnedStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }

  function setSearchHistory(updater: (current: string[]) => string[]) {
    setGlobalSearchHistory((current) => {
      const next = updater(current).slice(0, 8);
      if (typeof window !== 'undefined') {
        if (next.length) {
          window.localStorage.setItem(globalSearchHistoryStorageKey, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(globalSearchHistoryStorageKey);
        }
      }
      return next;
    });
  }

  function applyCurrentPageSearch(query: string) {
    const normalizedQuery = query.trim();
    const params = new URLSearchParams(searchParams.toString());
    const context = deriveWorkflowSearchContext(normalizedQuery, globalSearchResult);
    if (!normalizedQuery) {
      params.delete('query');
      params.delete('q');
      params.delete('booking');
      params.delete('shipment');
      params.delete('container');
    } else {
      params.set('query', normalizedQuery);
      params.delete('q');
      if (context.booking) {
        params.set('booking', context.booking);
      } else {
        params.delete('booking');
      }
      if (context.shipment) {
        params.set('shipment', context.shipment);
      } else {
        params.delete('shipment');
      }
      if (context.container) {
        params.set('container', context.container);
      } else {
        params.delete('container');
      }
    }
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    setGlobalSearchOpen(false);
  }

  function runGlobalSearchAction(action: 'tracking' | 'shipment' | 'empty-return') {
    const containerNo = globalSearchResult?.container?.containerNo || '';
    const bookingNo = globalSearchResult?.container?.bookingNo || '';
    const historyValue = (containerNo || bookingNo || globalSearchValue).trim();
    if (historyValue) {
      setSearchHistory((current) => [historyValue, ...current.filter((item) => item.toLowerCase() !== historyValue.toLowerCase())]);
    }
    if (action === 'tracking' && containerNo) {
      router.push(`/tracking?query=${encodeURIComponent(containerNo)}`);
    }
    if (action === 'shipment' && bookingNo) {
      router.push(`/shipments/enterprise?booking=${encodeURIComponent(bookingNo)}`);
    }
    if (action === 'empty-return' && containerNo) {
      router.push(`/operations/empty-return?q=${encodeURIComponent(containerNo)}`);
    }
    setGlobalSearchOpen(false);
  }

  const activePinnedSearchValue = (
    globalSearchResult?.container?.containerNo ||
    globalSearchResult?.container?.bookingNo ||
    globalSearchValue
  ).trim();
  const isPinnedActiveSearch = Boolean(
    activePinnedSearchValue &&
    globalSearchPinned.some((item) => item.toLowerCase() === activePinnedSearchValue.toLowerCase()),
  );

  return (
    <div className="search-box global-search-box" ref={globalSearchRef}>
      <form
        className="search-box-form"
        onSubmit={(event) => {
          event.preventDefault();
          const query = globalSearchValue.trim();
          if (!query) return;
          setSearchHistory((current) => [query, ...current.filter((item) => item.toLowerCase() !== query.toLowerCase())]);
          if (isConsoleWorkspaceRoute || isShippingWorkspaceRoute) {
            applyCurrentPageSearch(query);
            return;
          }
          router.push(`/tracking?query=${encodeURIComponent(query)}`);
          setGlobalSearchOpen(false);
        }}
      >
        <SearchIcon size={16} className="search-box-icon" />
        <input
          ref={globalSearchInputRef}
          className="field field-compact"
          aria-label="Universal container search"
          placeholder="Find container / BL / booking from any page"
          value={globalSearchValue}
          onChange={(event) => setGlobalSearchValue(event.target.value)}
          onFocus={() => {
            if (globalSearchResult?.container || globalSearchHistory.length) setGlobalSearchOpen(true);
          }}
          onKeyDown={(event) => {
            if (!globalSearchOpen || !globalSearchResult?.container) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setGlobalSearchActionIndex((current) => Math.min(current + 1, 2));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setGlobalSearchActionIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const actions: Array<'tracking' | 'shipment' | 'empty-return'> = ['tracking', 'shipment', 'empty-return'];
              runGlobalSearchAction(actions[globalSearchActionIndex] || 'tracking');
            } else if (event.key === 'Escape') {
              setGlobalSearchOpen(false);
              setGlobalSearchActionIndex(0);
            }
          }}
        />
      </form>
      {globalSearchLoading ? <span className="search-box-status">Searching…</span> : null}
      {globalSearchOpen ? (
        <div className="global-search-panel">
          {globalSearchResult?.container ? (
            <>
              <div className="global-search-result">
                <div className="label">Container locator</div>
                <strong>Where is {renderHighlightedMatch(globalSearchResult.container.containerNo, globalSearchValue)}?</strong>
                <div className="global-search-meta">
                  <span>{globalSearchResult.container.currentStatus}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => {
                      if (!activePinnedSearchValue) return;
                      if (isPinnedActiveSearch) {
                        setPinnedGlobalSearches((current) =>
                          current.filter((item) => item.toLowerCase() !== activePinnedSearchValue.toLowerCase()),
                        );
                        return;
                      }
                      setPinnedGlobalSearches((current) => [
                        activePinnedSearchValue,
                        ...current.filter((item) => item.toLowerCase() !== activePinnedSearchValue.toLowerCase()),
                      ]);
                    }}
                  >
                    {isPinnedActiveSearch ? 'Pinned' : 'Pin'}
                  </button>
                </div>
              </div>
              <div className="global-search-grid">
                <div><span>Exact location</span><strong>{renderHighlightedMatch(globalSearchResult.container.currentLocation, globalSearchValue)}</strong></div>
                <div><span>Booking</span><strong>{renderHighlightedMatch(globalSearchResult.container.bookingNo, globalSearchValue)}</strong></div>
                <div><span>Shipment</span><strong>{renderHighlightedMatch(globalSearchResult.container.shipmentNo, globalSearchValue)}</strong></div>
                <div><span>Owner</span><strong>{renderHighlightedMatch(globalSearchResult.container.returnedBy || globalSearchResult.container.deliveredBy || globalSearchResult.container.assignedDriver || 'Pending owner', globalSearchValue)}</strong></div>
                <div><span>Return status</span><strong>{globalSearchResult.container.returnStatus || 'Pending'}</strong></div>
                <div><span>Last update</span><strong>{globalSearchResult.container.updatedAt ? new Date(globalSearchResult.container.updatedAt).toLocaleString() : 'Pending'}</strong></div>
              </div>
              <div className="global-search-actions">
                <button type="button" className={globalSearchActionIndex === 0 ? 'btn btn-secondary btn-compact global-search-action-active' : 'btn btn-secondary btn-compact'} onClick={() => {
                  runGlobalSearchAction('tracking');
                }}>
                  Open tracking
                </button>
                <button type="button" className={globalSearchActionIndex === 1 ? 'btn btn-secondary btn-compact global-search-action-active' : 'btn btn-secondary btn-compact'} onClick={() => {
                  runGlobalSearchAction('shipment');
                }}>
                  Open shipment
                </button>
                <button type="button" className={globalSearchActionIndex === 2 ? 'btn btn-secondary btn-compact global-search-action-active' : 'btn btn-secondary btn-compact'} onClick={() => {
                  runGlobalSearchAction('empty-return');
                }}>
                  Open empty return
                </button>
              </div>
              {globalSearchResult.events?.[0] ? (
                <div className="global-search-foot">
                  Latest event: {renderHighlightedMatch(globalSearchResult.events[0].eventType, globalSearchValue)} @ {renderHighlightedMatch(globalSearchResult.events[0].location, globalSearchValue)}
                </div>
              ) : null}
            </>
          ) : globalSearchValue.trim().length >= 3 ? (
            <div className="global-search-empty">No matching container, BL, or booking found.</div>
          ) : globalSearchPinned.length || globalSearchHistory.length ? (
            <>
              {globalSearchPinned.length ? (
                <>
                  <div className="global-search-result">
                    <div className="label">Pinned containers</div>
                    <div className="global-search-meta">
                      <span>{globalSearchPinned.length} saved</span>
                      <button
                        type="button"
                        className="global-search-clear"
                        onClick={() => {
                          setGlobalSearchPinned([]);
                          if (typeof window !== 'undefined') {
                            window.localStorage.removeItem(globalSearchPinnedStorageKey);
                          }
                        }}
                      >
                        Clear pinned
                      </button>
                    </div>
                  </div>
                  <div className="global-search-history">
                    {globalSearchPinned.map((item) => (
                      <div
                        key={item}
                        className="global-search-history-item global-search-history-item-pinned"
                      >
                        <button
                          type="button"
                          className="global-search-history-main"
                          onClick={() => {
                            setGlobalSearchValue(item);
                            setGlobalSearchOpen(true);
                          }}
                        >
                          {item}
                        </button>
                        <button
                          type="button"
                          className="global-search-history-remove"
                          aria-label={`Remove pinned search ${item}`}
                          onClick={() => {
                            setPinnedGlobalSearches((current) =>
                              current.filter((entry) => entry.toLowerCase() !== item.toLowerCase()),
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {globalSearchHistory.length ? (
                <>
                  <div className="global-search-result">
                    <div className="label">Recent searches</div>
                    <div className="global-search-meta">
                      <span>{globalSearchHistory.length} saved</span>
                      <button
                        type="button"
                        className="global-search-clear"
                        onClick={() => {
                          setSearchHistory(() => []);
                        }}
                      >
                        Clear history
                      </button>
                    </div>
                  </div>
                  <div className="global-search-history">
                    {globalSearchHistory.map((item) => (
                      <div
                        key={item}
                        className="global-search-history-item"
                      >
                        <button
                          type="button"
                          className="global-search-history-main"
                          onClick={() => {
                            setGlobalSearchValue(item);
                            setGlobalSearchOpen(true);
                          }}
                        >
                          {item}
                        </button>
                        <button
                          type="button"
                          className="global-search-history-remove"
                          aria-label={`Remove recent search ${item}`}
                          onClick={() => {
                            setSearchHistory((current) =>
                              current.filter((entry) => entry.toLowerCase() !== item.toLowerCase()),
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="global-search-empty">Type at least 3 characters to search.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
