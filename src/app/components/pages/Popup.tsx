import {
  FC,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useRef,
  useState,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Checkbox from "@radix-ui/react-checkbox";
import { useAtomValue } from "jotai";
import classNames from "clsx";

import { AccountAsset, TokenType } from "core/types";
import * as repo from "core/repo";

import { LOAD_MORE_ON_ASSET_FROM_END, Page } from "app/defaults";
import { openInTab } from "app/helpers";
import { currentAccountAtom } from "app/atoms";
import { useAccountTokens } from "app/hooks/tokens";
import PopupLayout from "app/components/layouts/PopupLayout";
import PreloadUnlocked from "app/components/layouts/PreloadUnlocked";
import NetworkSelect from "app/components/elements/NetworkSelect";
import AccountSelect from "app/components/elements/AccountSelect";
import AssetsSwitcher from "app/components/elements/AssetsSwitcher";
import SearchInput from "app/components/elements/SearchInput";
import IconedButton from "app/components/elements/IconedButton";
import ScrollAreaContainer from "app/components/elements/ScrollAreaContainer";
import PrettyAmount from "app/components/elements/PrettyAmount";
import Tooltip from "app/components/elements/Tooltip";
import ControlIcon from "app/components/elements/ControlIcon";
import { ReactComponent as PopoverIcon } from "app/icons/popover.svg";
import { ReactComponent as SendIcon } from "app/icons/send-small.svg";
import { ReactComponent as SwapIcon } from "app/icons/swap.svg";
import { ReactComponent as ActivityIcon } from "app/icons/activity.svg";
import { ReactComponent as CheckIcon } from "app/icons/terms-check.svg";

const Popup: FC = () => (
  <PopupLayout>
    <PreloadUnlocked>
      <NetworkSelect
        className="max-w-auto"
        currentItemClassName="!px-3 !py-1.5"
        currentItemIconClassName="w-8 h-8 !mr-3"
        contentClassName="!min-w-[22.25rem]"
      />
      <AccountSelect className="mt-2" />
      <InteractionWithDapp
        className="mt-2"
        state="connected"
        icon="https://s2.coinmarketcap.com/static/img/coins/200x200/7278.png"
        name="app.uniswap.com"
      />

      <AssetsList />
    </PreloadUnlocked>
  </PopupLayout>
);

export default Popup;

type InteractionWithDappProps = {
  state?: "default" | "connectible" | "connected";
  icon?: string;
  name?: string;
  className?: string;
};

const InteractionWithDapp: FC<InteractionWithDappProps> = ({
  state = "default",
  icon,
  name,
  className,
}) => {
  if (state === "default" && !icon && !name) {
    return <></>;
  }

  return (
    <button
      type="button"
      className={classNames(
        "flex items-center",
        "w-full",
        "min-h-8 py-2 px-3 pr-4",
        "text-xs leading-none",
        "bg-brand-main/5",
        "rounded-[.625rem]",
        state !== "default" &&
          "cursor-pointer hover:bg-brand-main/10 focus-visible:bg-brand-main/10",
        className
      )}
    >
      <span
        className={classNames(
          "block",
          "w-5 h-5 mr-1.5",
          "rounded-full overflow-hidden",
          "border",
          !icon && "bg-brand-main/10",
          icon && state === "connected" && "bg-white",
          state !== "connected" && "border-[#BCC2DB]",
          state === "connected" && "border-[#4F9A5E]"
        )}
      >
        {icon && (
          <img
            src={icon}
            alt={name ?? "Dapp"}
            className={classNames(
              "w-full h-full object-cover",
              state === "connectible" && "opacity-50"
            )}
          />
        )}
      </span>
      {name && (
        <span
          className={classNames(
            state !== "connected" && "text-brand-inactivedark"
          )}
        >
          {name}
        </span>
      )}
      {state !== "default" && (
        <span className="ml-auto">
          {state === "connectible" ? "Connect" : "Disconnect"}
        </span>
      )}
    </button>
  );
};

const AssetsList: FC = () => {
  const currentAccount = useAtomValue(currentAccountAtom);
  const [isNftsSelected, setIsNftsSelected] = useState(false);
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [manageModeEnabled, setManageModeEnabled] = useState(false);

  const { tokens, loadMore, hasMore } = useAccountTokens(
    TokenType.Asset,
    currentAccount.address,
    {
      withDisabled: manageModeEnabled,
      search: searchValue ?? undefined,
      limit: 10,
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

  return (
    <>
      <div className="flex items-center mt-5">
        <Tooltip
          content={`Switch to ${isNftsSelected ? "assets" : "NFTs"}`}
          asChild
        >
          <span>
            <AssetsSwitcher
              theme="small"
              checked={isNftsSelected}
              onCheckedChange={setIsNftsSelected}
            />
          </span>
        </Tooltip>
        <SearchInput
          searchValue={searchValue}
          toggleSearchValue={setSearchValue}
          className="ml-2"
          inputClassName="max-h-9 !pl-9 !pr-10"
          placeholder="Type to search..."
          adornmentClassName="!left-3"
          clearButtonClassName="!right-3"
        />
        <IconedButton
          Icon={ControlIcon}
          iconProps={{
            isActive: manageModeEnabled,
          }}
          theme="tertiary"
          className={classNames(
            "ml-2",
            manageModeEnabled && "bg-brand-main/30"
          )}
          aria-label={
            manageModeEnabled
              ? "Finish managing assets list"
              : "Manage assets list"
          }
          onClick={() => setManageModeEnabled(!manageModeEnabled)}
        />
      </div>
      <ScrollAreaContainer
        className="pr-3.5 -mr-3.5 mt-2"
        viewPortClassName="pb-16 rounded-t-[.625rem]"
        scrollBarClassName="py-0 pb-16"
        hiddenScrollbar="horizontal"
      >
        {tokens.map((asset, i) => (
          <AssetCard
            key={asset.tokenSlug}
            ref={
              i === tokens.length - LOAD_MORE_ON_ASSET_FROM_END - 1
                ? loadMoreTriggerAssetRef
                : null
            }
            asset={asset as AccountAsset}
            isManageMode={manageModeEnabled}
            className={classNames(i !== tokens.length - 1 && "mb-1")}
          />
        ))}
      </ScrollAreaContainer>
    </>
  );
};

type AssetCardProps = {
  asset: AccountAsset;
  isManageMode?: boolean;
  className?: string;
};

const AssetCard = forwardRef<HTMLButtonElement, AssetCardProps>(
  ({ asset, isManageMode = false, className }, ref) => {
    const currentAccount = useAtomValue(currentAccountAtom);

    const [popoverOpened, setPopoverOpened] = useState(false);
    const { logoUrl, name, symbol, rawBalance, decimals, balanceUSD } = asset;

    const openLink = useCallback(
      (page: Page) => {
        openInTab({ page: page, token: asset.tokenSlug });
      },
      [asset.tokenSlug]
    );

    const handleAssetClick = useCallback(async () => {
      if (isManageMode) {
        try {
          await repo.accountTokens.put(
            {
              ...asset,
              balanceUSD:
                asset.balanceUSD !== undefined && asset.balanceUSD >= 0
                  ? -1
                  : 0,
            },
            [asset.chainId, currentAccount.address, asset.tokenSlug].join("_")
          );
        } catch (e) {
          console.error(e);
        }
      } else {
        if (!popoverOpened) {
          setPopoverOpened(true);
        }
      }
    }, [asset, currentAccount.address, isManageMode, popoverOpened]);

    const content = (
      <button
        ref={ref}
        type="button"
        onClick={handleAssetClick}
        className={classNames(
          "relative",
          "flex items-stretch",
          "w-full p-2",
          "text-left",
          "rounded-[.625rem]",
          "cursor-default",
          "group",
          "transition-colors",
          isManageMode &&
            "hover:bg-brand-main/10 focus-visible:bg-brand-main/10",
          className
        )}
      >
        <span
          className={classNames(
            "block",
            "w-11 h-11 min-w-[2.75rem] mr-3",
            "bg-white",
            "rounded-full overflow-hidden"
          )}
        >
          <img
            src={logoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </span>
        <span className="flex flex-col w-full">
          <span className="text-sm font-bold leading-5">{name}</span>
          <span className="mt-auto flex justify-between items-end">
            <PrettyAmount
              amount={rawBalance ?? 0}
              decimals={decimals}
              currency={symbol}
              className="text-sm font-bold leading-5"
              copiable
            />
            {!isManageMode && (
              <PrettyAmount
                amount={balanceUSD ?? 0}
                currency="$"
                className={classNames(
                  "ml-2",
                  "text-xs leading-4",
                  "text-brand-inactivedark",
                  "transition-colors"
                  // "group-hover:text-brand-light group-focus-visible:text-brand-light"
                )}
                copiable
              />
            )}
          </span>
        </span>
        {!isManageMode ? (
          <DropdownMenu.Trigger asChild>
            <IconedButton
              Icon={PopoverIcon}
              theme="tertiary"
              className={classNames(
                "ml-2",
                popoverOpened && "bg-brand-main/30 shadow-buttonsecondary"
              )}
              tabIndex={-1}
            />
          </DropdownMenu.Trigger>
        ) : (
          <Checkbox.Root
            className={classNames(
              "w-5 h-5 min-w-[1.25rem] mx-2 my-auto",
              "bg-brand-main/20",
              "rounded",
              "flex items-center justify-center",
              balanceUSD !== undefined &&
                balanceUSD >= 0 &&
                "border border-brand-main"
            )}
            checked={balanceUSD !== undefined && balanceUSD >= 0}
            asChild
          >
            <span>
              <Checkbox.Indicator>
                {balanceUSD !== undefined && balanceUSD >= 0 && <CheckIcon />}
              </Checkbox.Indicator>
            </span>
          </Checkbox.Root>
        )}
      </button>
    );

    if (!isManageMode) {
      return (
        <DropdownMenu.Root
          open={popoverOpened}
          onOpenChange={setPopoverOpened}
          modal
        >
          {content}
          <DropdownMenu.Content
            side="left"
            align="start"
            className={classNames(
              "bg-brand-dark/10",
              "backdrop-blur-[30px]",
              "border border-brand-light/5",
              "rounded-[.625rem]",
              "px-1 py-2"
            )}
          >
            <PopoverButton
              Icon={SendIcon}
              onClick={() => openLink(Page.Default)}
            >
              Info
            </PopoverButton>
            <PopoverButton Icon={SendIcon}>Transfer</PopoverButton>
            <PopoverButton Icon={SwapIcon}>Swap</PopoverButton>
            <PopoverButton Icon={ActivityIcon}>Activity</PopoverButton>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      );
    }

    return content;
  }
);

type PopoverButton = HTMLAttributes<HTMLButtonElement> & {
  Icon: FC<{ className?: string }>;
};

const PopoverButton: FC<PopoverButton> = ({ Icon, children, ...rest }) => (
  <button
    type="button"
    className={classNames(
      "flex items-center",
      "min-w-[7.5rem] w-full px-2 py-1",
      "rounded-[.625rem]",
      "text-sm font-bold",
      "transition-colors",
      "hover:bg-brand-main/20 focus:bg-brand-main/20"
    )}
    {...rest}
  >
    <Icon className="mr-2" />
    {children}
  </button>
);
