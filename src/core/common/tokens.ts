import { TokenStandard } from "core/types";

export const NATIVE_TOKEN_SLUG = createTokenSlug({
  standard: TokenStandard.Native,
  address: "0",
  id: "0",
});

export type ParsedTokenSlug = {
  standard: TokenStandard;
  address: string;
  id: string;
};

export function createTokenSlug({ standard, address, id }: ParsedTokenSlug) {
  return `${standard}_${address}_${id}`;
}

export function parseTokenSlug(slug: string) {
  const [standard, address, id] = slug.split("_");

  return { standard, address, id } as ParsedTokenSlug;
}

export function createAccountTokenKey({
  chainId,
  accountAddress,
  tokenSlug,
}: {
  chainId: number;
  accountAddress: string;
  tokenSlug: string;
}) {
  return `${chainId}_${accountAddress}_${tokenSlug}`;
}

export function getNativeTokenLogoUrl(chainTag: string) {
  return `{{native}}/${chainTag}`;
}
