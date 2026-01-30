import { useState, useCallback, useEffect } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
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
  skipped?: boolean; // Fee was skipped (disabled or zero amount)
  walletTransfers?: { address: string; amount: bigint; label?: string }[];
};

interface FeeWallet {
  address: string;
  percentage: number;
  label?: string;
}

interface FeeConfig {
  feeAddress: string;
  feeBps: number;
  enabled: boolean;
  wallets?: FeeWallet[];
}

export default function useFeeCollection() {
  const [isCollectingFee, setIsCollectingFee] = useState(false);
  const [feeError, setFeeError] = useState<Error | null>(null);
  const [feeConfig, setFeeConfig] = useState<FeeConfig>({
    feeAddress: "",
    feeBps: 0,
    enabled: false,
    wallets: [],
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    async function loadFeeConfig() {
      try {
        const response = await fetch("/api/config/fees");
        if (response.ok) {
          const config = await response.json();
          console.log("[FeeCollection] Loaded fee config from API:", config);
          setFeeConfig({
            feeAddress: config.feeAddress || "",
            feeBps: config.feeBps || 0,
            enabled: config.enabled || false,
            wallets: config.wallets || [],
          });
        } else {
          console.warn("[FeeCollection] Failed to load fee config from API, using defaults");
        }
      } catch (err) {
        console.warn("[FeeCollection] Error loading fee config:", err);
      } finally {
        setConfigLoaded(true);
      }
    }
    loadFeeConfig();
  }, []);

  const calculateFeeAmount = useCallback(
    (orderValueUsdc: number): bigint => {
      if (!feeConfig.enabled || orderValueUsdc <= 0) {
        return BigInt(0);
      }

      const feeDecimal = orderValueUsdc * (feeConfig.feeBps / 10000);
      const feeAmount = BigInt(
        Math.floor(feeDecimal * Math.pow(10, USDC_E_DECIMALS))
      );
      return feeAmount;
    },
    [feeConfig.enabled, feeConfig.feeBps]
  );

  const collectFee = useCallback(
    async (
      relayClient: RelayClient,
      orderValueUsdc: number
    ): Promise<FeeCollectionResult> => {
      const hasMultiWallet = feeConfig.wallets && feeConfig.wallets.length > 0;
      
      console.log("[FeeCollection] collectFee called with:", {
        orderValueUsdc,
        feeEnabled: feeConfig.enabled,
        feeAddress: feeConfig.feeAddress,
        feeBps: feeConfig.feeBps,
        walletsCount: feeConfig.wallets?.length || 0,
        configLoaded,
      });
      
      if (!feeConfig.enabled) {
        console.log("[FeeCollection] Skipped - fee collection not enabled");
        return { success: true, feeAmount: BigInt(0), skipped: true };
      }

      // Check if we have valid recipients configured
      const hasLegacyAddress = !!feeConfig.feeAddress;
      if (!hasMultiWallet && !hasLegacyAddress) {
        console.log("[FeeCollection] Skipped - no fee recipients configured");
        return { success: true, feeAmount: BigInt(0), skipped: true };
      }

      const feeAmount = calculateFeeAmount(orderValueUsdc);
      console.log("[FeeCollection] Calculated fee amount:", feeAmount.toString(), "wei (", (Number(feeAmount) / Math.pow(10, USDC_E_DECIMALS)).toFixed(6), "USDC)");

      if (feeAmount <= BigInt(0)) {
        console.log("[FeeCollection] Skipped - fee amount is zero or negative");
        return { success: true, feeAmount: BigInt(0), skipped: true };
      }

      setIsCollectingFee(true);
      setFeeError(null);

      try {
        const transactions: { to: string; value: string; data: string }[] = [];
        const walletTransfers: { address: string; amount: bigint; label?: string }[] = [];

        if (hasMultiWallet && feeConfig.wallets) {
          // Multi-wallet batched transfers
          console.log("[FeeCollection] Building batched transfers for", feeConfig.wallets.length, "wallets");
          
          // First pass: calculate amounts for all wallets
          const validWallets = feeConfig.wallets.filter(w => w.address && w.percentage > 0);
          const walletAmounts: { wallet: FeeWallet; amount: bigint }[] = [];
          let totalDistributed = BigInt(0);
          
          for (const wallet of validWallets) {
            // Calculate this wallet's share of the total fee
            const walletAmount = (feeAmount * BigInt(Math.floor(wallet.percentage * 100))) / BigInt(10000);
            totalDistributed += walletAmount;
            walletAmounts.push({ wallet, amount: walletAmount });
          }
          
          // Allocate any rounding remainder to the last wallet
          const remainder = feeAmount - totalDistributed;
          if (remainder > BigInt(0) && walletAmounts.length > 0) {
            walletAmounts[walletAmounts.length - 1].amount += remainder;
            console.log(`[FeeCollection] Allocated rounding remainder of ${Number(remainder)} wei to last wallet`);
          }
          
          // Second pass: build transactions
          for (const { wallet, amount } of walletAmounts) {
            if (amount <= BigInt(0)) continue;
            
            console.log(`[FeeCollection] ${wallet.label || wallet.address}: ${(Number(amount) / Math.pow(10, USDC_E_DECIMALS)).toFixed(6)} USDC (${wallet.percentage}%)`);
            
            const transferData = encodeFunctionData({
              abi: ERC20_TRANSFER_ABI,
              functionName: "transfer",
              args: [wallet.address as `0x${string}`, amount],
            });

            transactions.push({
              to: USDC_E_CONTRACT_ADDRESS,
              value: "0",
              data: transferData,
            });
            
            walletTransfers.push({
              address: wallet.address,
              amount,
              label: wallet.label,
            });
          }
        } else {
          // Legacy single wallet transfer
          console.log("[FeeCollection] Building single transfer to:", feeConfig.feeAddress);
          const transferData = encodeFunctionData({
            abi: ERC20_TRANSFER_ABI,
            functionName: "transfer",
            args: [feeConfig.feeAddress as `0x${string}`, feeAmount],
          });

          transactions.push({
            to: USDC_E_CONTRACT_ADDRESS,
            value: "0",
            data: transferData,
          });
          
          walletTransfers.push({
            address: feeConfig.feeAddress,
            amount: feeAmount,
          });
        }

        if (transactions.length === 0) {
          console.log("[FeeCollection] Skipped - no valid transfers to execute");
          return { success: true, feeAmount: BigInt(0), skipped: true };
        }

        console.log("[FeeCollection] Executing batched relay transaction with", transactions.length, "transfers...");
        const response = await relayClient.execute(
          transactions,
          `Collect integrator fees: ${(Number(feeAmount) / Math.pow(10, USDC_E_DECIMALS)).toFixed(2)} USDC to ${transactions.length} wallet(s)`
        );
        console.log("[FeeCollection] Relay response received, waiting for confirmation...");
        const result = await response.wait();
        console.log("[FeeCollection] Transaction confirmed:", result?.transactionHash);

        return {
          success: true,
          feeAmount,
          txHash: result?.transactionHash,
          walletTransfers,
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
    [feeConfig.enabled, feeConfig.feeAddress, feeConfig.feeBps, feeConfig.wallets, configLoaded, calculateFeeAmount]
  );

  return {
    collectFee,
    calculateFeeAmount,
    isCollectingFee,
    feeError,
    isFeeCollectionEnabled: feeConfig.enabled,
    feeAddressConfigured: !!feeConfig.feeAddress,
    feeBps: feeConfig.feeBps,
    configLoaded,
  };
}
