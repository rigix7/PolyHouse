export const INTEGRATOR_FEE_ADDRESS = import.meta.env.VITE_INTEGRATOR_FEE_ADDRESS || "";

export const INTEGRATOR_FEE_BPS = parseInt(
  import.meta.env.VITE_INTEGRATOR_FEE_BPS || "0",
  10
);
