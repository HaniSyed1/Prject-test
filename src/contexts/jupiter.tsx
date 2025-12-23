import React, { useContext, useEffect, useMemo, useState } from "react";
import { Configuration, DefaultApi } from "@jup-ag/api";
import { TokenInfo } from "@solana/spl-token-registry";
import axios from "axios";

type RouteMap = Map<string, string[]>;

interface JupiterApiContext {
  api: DefaultApi;
  loaded: boolean;
  tokenMap: Map<string, TokenInfo>;
  routeMap: RouteMap;
}

const JupiterApiContext = React.createContext<JupiterApiContext | null>(null);

const getTokens = async () => {
  const { data } = await axios.get("https://cache.jup.ag/tokens");
  return data as TokenInfo[];
};

const getTopTokens = async () => {
  const { data } = await axios.get("https://cache.jup.ag/top-tokens");
  return data as string[];
};

export const JupiterApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [routeMap, setRouteMap] = useState<RouteMap>(new Map());
  const [loaded, setLoaded] = useState(false);

  // ✅ FIXED useMemo
  const api = useMemo(() => {
    const config = new Configuration({
      basePath:
        process.env.NEXT_PUBLIC_JUP_SWAP_API ??
        "https://public.jupiterapi.com",
    });

    return new DefaultApi(config);
  }, []);

  useEffect(() => {
    (async () => {
      const [tokenList, , indexedRouteMapResult] = await Promise.all([
        getTokens(),
        getTopTokens(),
        api.v1IndexedRouteMapGet(),
      ]);

      const { indexedRouteMap = {}, mintKeys = [] } =
        indexedRouteMapResult;

      const routeMap = Object.keys(indexedRouteMap).reduce((map, key) => {
        map.set(
          mintKeys[Number(key)],
          indexedRouteMap[key].map((i) => mintKeys[i])
        );
        return map;
      }, new Map<string, string[]>());

      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map<string, TokenInfo>())
      );

      setRouteMap(routeMap);
      setLoaded(true);
    })();
  }, [api]);

  return (
    <JupiterApiContext.Provider value={{ api, routeMap, tokenMap, loaded }}>
      {children}
    </JupiterApiContext.Provider>
  );
};

export const useJupiterApiContext = () => {
  const context = useContext(JupiterApiContext);

  if (!context) {
    throw new Error(
      "useJupiterApiContext must be used within a JupiterApiProvider"
    );
  }

  return context;
};
