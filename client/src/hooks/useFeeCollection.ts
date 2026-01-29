import { useState, useCallback } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import {
  INTEGRATOR_FEE_ADDRESS,
  INTEGRATOR_FEE_BPS,
} from "@/constants/config";
import { USDC_E_DECIMALS, USDC_E_CONTRACT_ADDRESS } from "@/constants/tokens";
import { encodeFunctionData } from "viem";

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export type FeeCollectionResult = {
  success: boolean;
  feeAmount: bigint;
  txHash?: string;
};

export default function useFeeCollection() {
  const [isCollectingFee, setIsCollectingFee] = useState(false);
  const [feeError, setFeeError] = useState<Error | null>(null);

  const isFeeCollectionEnabled =
    !!INTEGRATOR_FEE_ADDRESS && INTEGRATOR_FEE_BPS > 0;

  const calculateFeeAmount = useCallback(
    (orderValueUsdc: number): bigint => {
      if (!isFeeCollectionEnabled || orderValueUsdc <= 0) {
        return BigInt(0);
      }

      const feeDecimal = orderValueUsdc * (INTEGRATOR_FEE_BPS / 10000);
      const feeAmount = BigInt(
        Math.floor(feeDecimal * Math.pow(10, USDC_E_DECIMALS))
      );
      return feeAmount;
    },
    [isFeeCollectionEnabled]
  );

  const collectFee = useCallback(
    async (
      relayClient: RelayClient,
      orderValueUsdc: number
    ): Promise<FeeCollectionResult> => {
      console.log("[FeeCollection] collectFee called with:", {
        orderValueUsdc,
        isFeeCollectionEnabled,
        feeAddress: INTEGRATOR_FEE_ADDRESS,
        feeBps: INTEGRATOR_FEE_BPS,
      });
      
      if (!isFeeCollectionEnabled) {
        console.log("[FeeCollection] Skipped - fee collection not enabled");
        return { success: true, feeAmount: BigInt(0) };
      }

      if (!INTEGRATOR_FEE_ADDRESS) {
        console.log("[FeeCollection] Skipped - no fee address configured");
        return { success: true, feeAmount: BigInt(0) };
      }

      const feeAmount = calculateFeeAmount(orderValueUsdc);
      console.log("[FeeCollection] Calculated fee amount:", feeAmount.toString(), "wei (", (Number(feeAmount) / Math.pow(10, USDC_E_DECIMALS)).toFixed(6), "USDC)");

      if (feeAmount <= BigInt(0)) {
        console.log("[FeeCollection] Skipped - fee amount is zero or negative");
        return { success: true, feeAmount: BigInt(0) };
      }

      setIsCollectingFee(true);
      setFeeError(null);

      try {
        console.log("[FeeCollection] Building transfer transaction to:", INTEGRATOR_FEE_ADDRESS);
        const transferData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [INTEGRATOR_FEE_ADDRESS as `0x${string}`, feeAmount],
        });

        const feeTransferTx = {
          to: USDC_E_CONTRACT_ADDRESS,
          value: "0",
          data: transferData,
        };

        console.log("[FeeCollection] Executing relay transaction...");
        const response = await relayClient.execute(
          [feeTransferTx],
          `Collect integrator fee: ${(Number(feeAmount) / Math.pow(10, USDC_E_DECIMALS)).toFixed(2)} USDC`
        );
        console.log("[FeeCollection] Relay response received, waiting for confirmation...");
        const result = await response.wait();
        console.log("[FeeCollection] Transaction confirmed:", result?.transactionHash);

        return {
          success: true,
          feeAmount,
          txHash: result?.transactionHash,
        };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to collect fee");
        setFeeError(error);
        console.error("[FeeCollection] Fee collection error:", error);

        return { success: false, feeAmount };
      } finally {
        setIsCollectingFee(false);
      }
    },
    [isFeeCollectionEnabled, calculateFeeAmount]
  );

  return {
    collectFee,
    calculateFeeAmount,
    isCollectingFee,
    feeError,
    isFeeCollectionEnabled,
    feeAddressConfigured: !!INTEGRATOR_FEE_ADDRESS,
    feeBps: INTEGRATOR_FEE_BPS,
  };
}
