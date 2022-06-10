import { FC, memo } from "react";
import classNames from "clsx";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";

import {
  AccountAsset,
  FeeMode,
  FeeSuggestions,
  TokenTransferAction,
} from "core/types";
import { NATIVE_TOKEN_SLUG } from "core/common/tokens";

import {
  TippySingletonProvider,
  useAccountToken,
  useLazyNetwork,
} from "app/hooks";
import TabHeader from "app/components/elements/approvals/TabHeader";
import PrettyAmount from "app/components/elements/PrettyAmount";
import FiatAmount from "app/components/elements/FiatAmount";
import HashPreview from "app/components/elements/HashPreview";
import IconedButton from "app/components/elements/IconedButton";
import SmallContactCard from "app/components/elements/SmallContactCard";
import AssetLogo from "app/components/elements/AssetLogo";
import { FEE_MODE_NAMES } from "app/components/screens/approvals/Transaction";
import { ReactComponent as WalletExplorerIcon } from "app/icons/external-link.svg";
import { ReactComponent as ChevronRightIcon } from "app/icons/chevron-right.svg";

type DetailsTabProps = Omit<FeeButton, "onClick"> & {
  action: TokenTransferAction;
  onFeeButtonClick: () => void;
};

const DetailsTab: FC<DetailsTabProps> = ({
  fees,
  gasLimit,
  maxFee,
  feeMode,
  action,
  onFeeButtonClick,
}) => {
  return (
    <>
      <TabHeader>Tokens transferring</TabHeader>
      <FeeButton
        fees={fees}
        gasLimit={gasLimit}
        maxFee={maxFee}
        feeMode={feeMode}
        onClick={onFeeButtonClick}
      />
      <Recipient address={action.toAddress} />
      <Tokens tokens={action.tokens} />
    </>
  );
};

export default DetailsTab;

type FeeButton = {
  fees: FeeSuggestions;
  gasLimit: ethers.BigNumber;
  maxFee: ethers.BigNumber | null;
  feeMode: FeeMode;
  onClick: () => void;
};

const FeeButton: FC<FeeButton> = ({
  gasLimit,
  fees,
  maxFee,
  feeMode,
  onClick,
}) => {
  const nativeToken = useAccountToken(NATIVE_TOKEN_SLUG);
  const modeMaxFee = gasLimit.mul(fees.modes[feeMode].max).toString();
  const usdAmount = nativeToken?.priceUSD
    ? new BigNumber(modeMaxFee)
        .div(new BigNumber(10).pow(nativeToken.decimals))
        .multipliedBy(nativeToken.priceUSD)
    : new BigNumber(0);

  return (
    <button
      type="button"
      className={classNames(
        "w-full",
        "rounded-[.625rem]",
        "flex items-center",
        "py-3 pr-2 pl-4 mb-3",
        "bg-brand-main/5",
        "transition-colors",
        "hover:bg-brand-main/10"
      )}
      onClick={onClick}
    >
      <span className="flex flex-col grow">
        <span
          className={classNames(
            "flex items-center justify-between",
            "mb-0.5",
            "text-sm"
          )}
        >
          Network fee
          <span className="ml-auto flex items-center">
            <PrettyAmount
              amount={modeMaxFee}
              currency={nativeToken?.symbol}
              decimals={nativeToken?.decimals}
              threeDots={false}
              className=""
            />
            <Dot />
            <FiatAmount amount={usdAmount} threeDots={false} className="" />
          </span>
        </span>
        <span
          className={classNames("flex items-center justify-between", "text-xs")}
        >
          <FeeModeLabel feeMode={feeMode} />
          {maxFee && nativeToken && (
            <span>
              <span className="font-bold">Max fee:</span>
              <PrettyAmount
                amount={maxFee.toString()}
                decimals={nativeToken.decimals}
                currency={nativeToken.symbol}
                threeDots={false}
                className="ml-2"
              />
            </span>
          )}
        </span>
      </span>
      <ChevronRightIcon className="w-6 h-auto ml-2" />
    </button>
  );
};

type FeeModeLabelProps = {
  feeMode: FeeMode;
};

const FeeModeLabel: FC<FeeModeLabelProps> = ({ feeMode }) => (
  <span
    className={classNames(
      "py-0.5 pl-1.5 pr-2.5",
      "rounded-md",
      "border border-brand-main/[.07] text-sm",
      "flex items-center"
    )}
  >
    <span className="mr-1.5 text-xs">{FEE_MODE_NAMES[feeMode].icon}</span>
    <span className="-mt-px text-xs">{FEE_MODE_NAMES[feeMode].name}</span>
  </span>
);

type RecipientProps = {
  address: string;
};

const Recipient: FC<RecipientProps> = ({ address }) => {
  const currentNetwork = useLazyNetwork();

  return (
    <InfoRaw label="Recipient">
      <div className="flex flex-col items-end">
        <div className="flex items-center">
          <TippySingletonProvider>
            <HashPreview hash={address} className="text-sm" />
            {currentNetwork?.explorerUrls && (
              <IconedButton
                href={`${currentNetwork.explorerUrls}/address/${address}`}
                aria-label="View wallet in Explorer"
                Icon={WalletExplorerIcon}
                className="!w-6 !h-6 ml-2"
                iconClassName="!w-[1.125rem]"
              />
            )}
          </TippySingletonProvider>
        </div>
        <SmallContactCard address={address} className="mt-2 mb-0" />
      </div>
    </InfoRaw>
  );
};

type TokensProps = {
  tokens: Token[];
};

const Tokens: FC<TokensProps> = ({ tokens }) => (
  <InfoRaw label={tokens.length > 1 ? "Tokens" : "Token"}>
    <div className="flex flex-col">
      {tokens.map((token, i) => (
        <Token
          key={token.slug}
          token={token}
          className={classNames(i !== tokens.length - 1 && "mb-2")}
        />
      ))}
    </div>
  </InfoRaw>
);

type Token = {
  slug: string;
  amount: string;
};

type TokenProps = {
  token: Token;
  className?: string;
};

const Token = memo<TokenProps>(({ token: { slug, amount }, className }) => {
  const tokenInfo = useAccountToken(slug);

  if (!tokenInfo) return null;

  const { name, symbol, decimals, priceUSD } = tokenInfo as AccountAsset;

  const usdAmount = new BigNumber(amount)
    .div(new BigNumber(10).pow(decimals))
    .multipliedBy(priceUSD ?? 1);

  return (
    <div className={classNames("flex items-center", className)}>
      <AssetLogo
        asset={tokenInfo}
        alt={name}
        className="w-4 h-4 min-w-[.25rem] mr-2"
      />
      <PrettyAmount
        amount={amount}
        decimals={decimals}
        currency={symbol}
        threeDots={false}
        copiable
        className="text-sm font-bold"
      />
      <Dot />
      <FiatAmount
        amount={usdAmount}
        threeDots={false}
        copiable
        className="text-sm text-brand-inactivedark"
      />
    </div>
  );
});

const Dot: FC = () => (
  <span className="flex items-center justify-center p-2">
    <span className="w-1 h-1 bg-brand-inactivedark rounded-full" />
  </span>
);

type InfoRawProps = {
  label: string;
};

const InfoRaw: FC<InfoRawProps> = ({ label, children }) => (
  <div className="py-3 pl-4 flex items-start">
    <h3 className="text-sm mr-auto">{label}</h3>
    {children}
  </div>
);