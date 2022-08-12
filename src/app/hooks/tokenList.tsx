import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ethers } from "ethers";

import { TokenStandard, TokenType } from "core/types";
import { createTokenSlug, detectNFTStandard } from "core/common/tokens";
import { findToken } from "core/client";

import { currentAccountAtom } from "app/atoms";
import {
  useChainId,
  useIsSyncing,
  useAllAccountTokens,
  useProvider,
} from "app/hooks";

export function useTokenList(
  tokenType: TokenType,
  onAccountTokensReset?: () => void
) {
  const currentAccount = useAtomValue(currentAccountAtom);
  const chainId = useChainId();
  const provider = useProvider();

  const isNftsSelected = tokenType === TokenType.NFT;

  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [tokenIdSearchValue, setTokenIdSearchValue] = useState<string | null>(
    null
  );
  const [manageModeEnabled, setManageModeEnabled] = useState(false);

  const combinedSearchValue = useMemo(() => {
    if (!searchValue) return undefined;
    if (!tokenIdSearchValue) return searchValue;

    return `${searchValue}:${tokenIdSearchValue}`;
  }, [searchValue, tokenIdSearchValue]);

  const { tokens, loadMore, hasMore } = useAllAccountTokens(
    tokenType,
    currentAccount.address,
    {
      withDisabled:
        manageModeEnabled || Boolean(isNftsSelected && combinedSearchValue),
      search: combinedSearchValue,
      onReset: onAccountTokensReset,
    }
  );

  const observer = useRef<IntersectionObserver>();
  const loadMoreTriggerAssetRef = useCallback(
    (node) => {
      if (!tokens) return;

      if (observer.current) {
        observer.current.disconnect();
      }
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) {
        observer.current.observe(node);
      }
    },
    [hasMore, loadMore, tokens]
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tokenIdSearchInputRef = useRef<HTMLInputElement>(null);

  const focusSearchInput = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.select();
    }
  }, []);

  const syncing = useIsSyncing();

  const searchValueIsAddress = useMemo(
    () => searchValue && ethers.utils.isAddress(searchValue),
    [searchValue]
  );

  const tokenIdSearchDisplayed = Boolean(
    isNftsSelected && searchValueIsAddress
  );
  const willSearch = Boolean(
    searchValueIsAddress &&
      tokens.length === 0 &&
      (tokenIdSearchDisplayed ? tokenIdSearchValue : true)
  );

  useEffect(() => {
    if (!tokenIdSearchDisplayed) {
      setTokenIdSearchValue(null);
    }
  }, [tokenIdSearchDisplayed, setTokenIdSearchValue]);

  useEffect(() => {
    if (willSearch) {
      const t = setTimeout(async () => {
        const tokenAddress = ethers.utils.getAddress(searchValue!);

        let tokenSlug: string;

        if (isNftsSelected) {
          if (!tokenIdSearchValue) return;

          try {
            const tokenId =
              ethers.BigNumber.from(tokenIdSearchValue).toString();
            const tokenStandard = await detectNFTStandard(
              provider,
              tokenAddress,
              tokenId
            );

            tokenSlug = createTokenSlug({
              standard: tokenStandard,
              address: tokenAddress,
              id: tokenId,
            });
          } catch (err) {
            console.warn(err);
            return;
          }
        } else {
          tokenSlug = createTokenSlug({
            standard: TokenStandard.ERC20,
            address: ethers.utils.getAddress(searchValue!),
            id: "0",
          });
        }

        findToken(chainId, currentAccount.address, tokenSlug);
      }, 300);

      return () => clearTimeout(t);
    }

    return;
  }, [
    chainId,
    provider,
    currentAccount.address,
    willSearch,
    isNftsSelected,
    searchValue,
    tokenIdSearchValue,
  ]);

  const searching = willSearch && syncing;

  return {
    currentAccount,
    isNftsSelected,
    searchValue,
    setSearchValue,
    tokenIdSearchValue,
    setTokenIdSearchValue,
    tokenIdSearchDisplayed,
    manageModeEnabled,
    setManageModeEnabled,
    tokens,
    syncing,
    searching,
    focusSearchInput,
    searchInputRef,
    tokenIdSearchInputRef,
    loadMoreTriggerAssetRef,
  };
}