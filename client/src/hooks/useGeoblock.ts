import { useState, useEffect } from "react";
import { checkGeoblock, type GeoblockStatus } from "@/lib/polymarketErrors";

export function useGeoblock() {
  const [status, setStatus] = useState<GeoblockStatus>({
    blocked: false,
    checked: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setIsLoading(true);
      const result = await checkGeoblock();
      
      if (mounted) {
        setStatus(result);
        setIsLoading(false);
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isBlocked: status.blocked,
    country: status.country,
    region: status.region,
    isLoading,
    hasChecked: status.checked,
    error: status.error,
  };
}
