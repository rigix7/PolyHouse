import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WhiteLabelConfig, ThemeConfig, PointsConfig } from "@shared/schema";

const CSS_VARIABLES = [
  "--wl-brand-primary",
  "--wl-brand-accent",
  "--wl-header-bg",
  "--wl-header-text",
  "--wl-header-accent",
  "--wl-betslip-bg",
  "--wl-betslip-card",
  "--wl-betslip-button",
  "--wl-betslip-success",
  "--wl-betslip-text",
  "--wl-market-bg",
  "--wl-market-hover",
  "--wl-market-border",
  "--wl-market-odds",
  "--wl-market-text",
  "--wl-sorting-bg",
  "--wl-sorting-active",
  "--wl-sorting-inactive",
  "--wl-nav-bg",
  "--wl-nav-active",
  "--wl-nav-inactive",
  "--wl-success",
  "--wl-error",
  "--wl-warning",
];

function clearAllVariables(root: HTMLElement) {
  CSS_VARIABLES.forEach((variable) => {
    root.style.removeProperty(variable);
  });
}

export function useWhiteLabelTheme() {
  const { data: config, isLoading } = useQuery<WhiteLabelConfig>({
    queryKey: ["/api/admin/white-label"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const root = document.documentElement;
    
    clearAllVariables(root);
    
    if (!config?.themeConfig) return;

    const theme = config.themeConfig as ThemeConfig;

    if (theme.brand?.primaryColor) {
      root.style.setProperty("--wl-brand-primary", theme.brand.primaryColor);
    }
    if (theme.brand?.accentColor) {
      root.style.setProperty("--wl-brand-accent", theme.brand.accentColor);
    }

    if (theme.header?.backgroundColor) {
      root.style.setProperty("--wl-header-bg", theme.header.backgroundColor);
    }
    if (theme.header?.textColor) {
      root.style.setProperty("--wl-header-text", theme.header.textColor);
    }
    if (theme.header?.accentColor) {
      root.style.setProperty("--wl-header-accent", theme.header.accentColor);
    }

    if (theme.betSlip?.backgroundColor) {
      root.style.setProperty("--wl-betslip-bg", theme.betSlip.backgroundColor);
    }
    if (theme.betSlip?.cardColor) {
      root.style.setProperty("--wl-betslip-card", theme.betSlip.cardColor);
    }
    if (theme.betSlip?.primaryButtonColor) {
      root.style.setProperty("--wl-betslip-button", theme.betSlip.primaryButtonColor);
    }
    if (theme.betSlip?.successColor) {
      root.style.setProperty("--wl-betslip-success", theme.betSlip.successColor);
    }
    if (theme.betSlip?.textColor) {
      root.style.setProperty("--wl-betslip-text", theme.betSlip.textColor);
    }

    if (theme.marketCards?.backgroundColor) {
      root.style.setProperty("--wl-market-bg", theme.marketCards.backgroundColor);
    }
    if (theme.marketCards?.hoverColor) {
      root.style.setProperty("--wl-market-hover", theme.marketCards.hoverColor);
    }
    if (theme.marketCards?.borderColor) {
      root.style.setProperty("--wl-market-border", theme.marketCards.borderColor);
    }
    if (theme.marketCards?.oddsBadgeColor) {
      root.style.setProperty("--wl-market-odds", theme.marketCards.oddsBadgeColor);
    }
    if (theme.marketCards?.textColor) {
      root.style.setProperty("--wl-market-text", theme.marketCards.textColor);
    }

    if (theme.sortingBar?.backgroundColor) {
      root.style.setProperty("--wl-sorting-bg", theme.sortingBar.backgroundColor);
    }
    if (theme.sortingBar?.activeTabColor) {
      root.style.setProperty("--wl-sorting-active", theme.sortingBar.activeTabColor);
    }
    if (theme.sortingBar?.inactiveTabColor) {
      root.style.setProperty("--wl-sorting-inactive", theme.sortingBar.inactiveTabColor);
    }

    if (theme.bottomNav?.backgroundColor) {
      root.style.setProperty("--wl-nav-bg", theme.bottomNav.backgroundColor);
    }
    if (theme.bottomNav?.activeColor) {
      root.style.setProperty("--wl-nav-active", theme.bottomNav.activeColor);
    }
    if (theme.bottomNav?.inactiveColor) {
      root.style.setProperty("--wl-nav-inactive", theme.bottomNav.inactiveColor);
    }

    if (theme.global?.successColor) {
      root.style.setProperty("--wl-success", theme.global.successColor);
    }
    if (theme.global?.errorColor) {
      root.style.setProperty("--wl-error", theme.global.errorColor);
    }
    if (theme.global?.warningColor) {
      root.style.setProperty("--wl-warning", theme.global.warningColor);
    }
  }, [config]);

  const pointsConfig: PointsConfig = config?.pointsConfig || {
    enabled: false,
    name: "$WILD",
    resetSchedule: "never",
    referralEnabled: false,
    referralPercentage: 10,
  };

  return {
    config,
    isLoading,
    brandName: (config?.themeConfig as ThemeConfig)?.brand?.name || "POLYHOUSE",
    logoUrl: (config?.themeConfig as ThemeConfig)?.brand?.logoUrl,
    logoIcon: (config?.themeConfig as ThemeConfig)?.brand?.logoIcon,
    primaryColor: (config?.themeConfig as ThemeConfig)?.brand?.primaryColor || "#f43f5e",
    pointsConfig,
  };
}

export default useWhiteLabelTheme;
