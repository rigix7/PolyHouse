export const INTEGRATOR_FEE_ADDRESS = import.meta.env.VITE_INTEGRATOR_FEE_ADDRESS || "";

export const INTEGRATOR_FEE_BPS = parseInt(
  import.meta.env.VITE_INTEGRATOR_FEE_BPS || "0",
  10
);

// Log fee config at startup to verify env vars are bundled correctly
console.log("[FeeConfig] Fee collection config:", {
  feeAddress: INTEGRATOR_FEE_ADDRESS || "(not set)",
  feeBps: INTEGRATOR_FEE_BPS,
  enabled: !!INTEGRATOR_FEE_ADDRESS && INTEGRATOR_FEE_BPS > 0,
});
