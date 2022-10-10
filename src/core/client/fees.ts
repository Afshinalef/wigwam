import { ethers } from "ethers";
import { suggestFees as suggestFeesPrimitive } from "@rainbow-me/fee-suggestions";
import memoize from "mem";

import { FeeSuggestions, FeesByModeModern, TPGasPrices } from "core/types";

import { ClientProvider } from "./provider";
import { getThirdPartyGasPrices } from "./wallet";

export async function suggestFees(
  provider: ClientProvider
): Promise<FeeSuggestions | null> {
  const eip1559 = await supportsEIP1559(provider);

  if (eip1559) {
    const base = await suggestFeesPrimitive(provider).catch(() => null);

    if (base) {
      const {
        baseFeeSuggestion,
        blocksToConfirmationByBaseFee,
        maxPriorityFeeSuggestions,
      } = base;

      const lowBaseFee = ethers.BigNumber.from(
        blocksToConfirmationByBaseFee[8]
      );
      const averageBaseFee = ethers.BigNumber.from(baseFeeSuggestion);
      const highBaseFee = averageBaseFee.mul(21).div(20); // x 1.05

      const lowPriorityFee = ethers.BigNumber.from(
        maxPriorityFeeSuggestions.normal
      );
      const averagePriorityFee = ethers.BigNumber.from(
        maxPriorityFeeSuggestions.fast
      );
      const highPriorityFee = ethers.BigNumber.from(
        maxPriorityFeeSuggestions.urgent
      );

      const modes: FeesByModeModern = {
        low: {
          max: lowBaseFee.add(lowPriorityFee),
          priority: lowPriorityFee,
        },
        average: {
          max: averageBaseFee.add(averagePriorityFee),
          priority: averagePriorityFee,
        },
        high: {
          max: highBaseFee.add(highPriorityFee),
          priority: highPriorityFee,
        },
      };

      return {
        type: "modern",
        modes,
        ...base,
      };
    }
  }

  const tpGasPrices = await getThirdPartyGasPrices(provider.chainId);
  const tpFeeSuggestions = etherifyTPGasPrices(tpGasPrices);

  if (tpFeeSuggestions) return tpFeeSuggestions;

  const chainGasPrice = await provider.getGasPrice();
  const step = 10 ** (chainGasPrice.lt(10 ** 9) ? 7 : 8);

  return {
    type: "legacy",
    modes: {
      low: { max: chainGasPrice.sub(step) },
      average: { max: chainGasPrice },
      high: { max: chainGasPrice.add(step) },
    },
  };
}

function etherifyTPGasPrices(tpGasPrices: TPGasPrices): FeeSuggestions | null {
  if (!tpGasPrices) return null;

  return {
    type: tpGasPrices.type,
    modes: Object.fromEntries(
      Object.entries(tpGasPrices.modes).map(([mode, fees]) => [
        mode,
        Object.fromEntries(
          Object.entries(fees).map(([prop, price]) => [
            prop,
            ethers.BigNumber.from(price),
          ])
        ),
      ])
    ),
  } as any;
}

const supportsEIP1559 = memoize(
  async (provider: ClientProvider) => {
    const feeData = await provider.getFeeData();
    return ethers.BigNumber.isBigNumber(feeData.maxPriorityFeePerGas);
  },
  {
    cacheKey: ([p]) => p.chainId,
  }
);
