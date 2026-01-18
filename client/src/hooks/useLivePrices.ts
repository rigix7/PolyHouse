import { useState, useEffect, useRef, useCallback } from "react";

const CLOB_WSS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const RECONNECT_INTERVAL_MS = 5000;
const PENDING_FLUSH_INTERVAL_MS = 100;

export interface LivePrice {
  tokenId: string;
  bestAsk: number;
  bestBid: number;
  timestamp: number;
}

export interface UseLivePricesResult {
  prices: Map<string, LivePrice>;
  isConnected: boolean;
  subscribe: (tokenIds: string[]) => void;
  unsubscribe: (tokenIds: string[]) => void;
}

interface PriceChange {
  asset_id: string;
  price: string;
  best_ask: string;
  best_bid: string;
}

interface PriceChangeEvent {
  event_type: string;
  asset_id: string;
  timestamp: string;
  price_changes: PriceChange[];
}

export function useLivePrices(): UseLivePricesResult {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedAssetIds = useRef<Set<string>>(new Set());
  const pendingSubscribeAssetIds = useRef<Set<string>>(new Set());
  const pendingUnsubscribeAssetIds = useRef<Set<string>>(new Set());
  const connectingRef = useRef(false);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushPendingSubscriptions = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (pendingUnsubscribeAssetIds.current.size > 0) {
      const toUnsubscribe = Array.from(pendingUnsubscribeAssetIds.current);
      const message = {
        operation: 'unsubscribe',
        assets_ids: toUnsubscribe,
      };
      try {
        ws.send(JSON.stringify(message));
        for (const assetId of toUnsubscribe) {
          subscribedAssetIds.current.delete(assetId);
        }
        pendingUnsubscribeAssetIds.current.clear();
        console.log("[LivePrices] Unsubscribed from", toUnsubscribe.length, "assets");
      } catch (error) {
        console.warn("[LivePrices] Failed to send unsubscribe message:", error);
      }
    }

    if (pendingSubscribeAssetIds.current.size > 0) {
      const toSubscribe = Array.from(pendingSubscribeAssetIds.current);
      const message = {
        operation: 'subscribe',
        assets_ids: toSubscribe,
      };
      try {
        ws.send(JSON.stringify(message));
        for (const assetId of toSubscribe) {
          subscribedAssetIds.current.add(assetId);
        }
        pendingSubscribeAssetIds.current.clear();
        console.log("[LivePrices] Subscribed to", toSubscribe.length, "assets");
      } catch (error) {
        console.warn("[LivePrices] Failed to send subscribe message:", error);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (connectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (pendingSubscribeAssetIds.current.size === 0 && subscribedAssetIds.current.size === 0) return;

    connectingRef.current = true;
    console.log("[LivePrices] Connecting to WebSocket...");

    try {
      const ws = new WebSocket(CLOB_WSS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[LivePrices] WebSocket connected");
        connectingRef.current = false;
        setIsConnected(true);

        const initMessage = {
          assets_ids: [],
          type: 'market',
        };
        ws.send(JSON.stringify(initMessage));

        flushPendingSubscriptions();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (Array.isArray(data)) {
            const priceEvents = data.filter((d: any) => d.event_type === 'price_change');
            if (priceEvents.length > 0) {
              setPrices((prev) => {
                const next = new Map(prev);
                for (const event of priceEvents as PriceChangeEvent[]) {
                  if (event.price_changes) {
                    for (const change of event.price_changes) {
                      if (subscribedAssetIds.current.has(change.asset_id)) {
                        next.set(change.asset_id, {
                          tokenId: change.asset_id,
                          bestAsk: parseFloat(change.best_ask),
                          bestBid: parseFloat(change.best_bid),
                          timestamp: parseInt(event.timestamp, 10),
                        });
                      }
                    }
                  }
                }
                return next;
              });
            }
          } else if (data.event_type === 'price_change' && data.price_changes) {
            setPrices((prev) => {
              const next = new Map(prev);
              for (const change of data.price_changes as PriceChange[]) {
                if (subscribedAssetIds.current.has(change.asset_id)) {
                  next.set(change.asset_id, {
                    tokenId: change.asset_id,
                    bestAsk: parseFloat(change.best_ask),
                    bestBid: parseFloat(change.best_bid),
                    timestamp: parseInt(data.timestamp, 10),
                  });
                }
              }
              return next;
            });
          }
        } catch (error) {
          console.warn("[LivePrices] Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("[LivePrices] WebSocket disconnected:", event.code, event.reason);
        connectingRef.current = false;
        setIsConnected(false);
        wsRef.current = null;

        for (const assetId of subscribedAssetIds.current) {
          pendingSubscribeAssetIds.current.add(assetId);
        }
        subscribedAssetIds.current.clear();

        if (pendingSubscribeAssetIds.current.size > 0) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL_MS);
        }
      };

      ws.onerror = (error) => {
        console.error("[LivePrices] WebSocket error:", error);
        connectingRef.current = false;
      };

    } catch (error) {
      console.error("[LivePrices] Failed to create WebSocket:", error);
      connectingRef.current = false;
    }
  }, [flushPendingSubscriptions]);

  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      flushPendingSubscriptions();
    }, PENDING_FLUSH_INTERVAL_MS);

    return () => {
      console.log("[LivePrices] Cleaning up WebSocket");
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      subscribedAssetIds.current.clear();
      pendingSubscribeAssetIds.current.clear();
      pendingUnsubscribeAssetIds.current.clear();
    };
  }, [flushPendingSubscriptions]);

  const subscribe = useCallback((tokenIds: string[]) => {
    if (tokenIds.length === 0) return;
    
    console.log("[LivePrices] Subscribing to", tokenIds.length, "tokens");
    
    for (const assetId of tokenIds) {
      pendingUnsubscribeAssetIds.current.delete(assetId);
      if (!subscribedAssetIds.current.has(assetId)) {
        pendingSubscribeAssetIds.current.add(assetId);
      }
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
    }
  }, [connect]);

  const unsubscribe = useCallback((tokenIds: string[]) => {
    if (tokenIds.length === 0) return;
    
    console.log("[LivePrices] Unsubscribing from", tokenIds.length, "tokens");
    
    for (const assetId of tokenIds) {
      if (pendingSubscribeAssetIds.current.delete(assetId)) {
        continue;
      }
      if (subscribedAssetIds.current.has(assetId)) {
        pendingUnsubscribeAssetIds.current.add(assetId);
      }
    }
  }, []);

  return { prices, isConnected, subscribe, unsubscribe };
}
