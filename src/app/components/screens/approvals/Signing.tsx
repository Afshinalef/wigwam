import {
  FC,
  lazy,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import classNames from "clsx";
import { ethers } from "ethers";
import { useAtomValue } from "jotai";
import { useCopyToClipboard } from "lib/react-hooks/useCopyToClipboard";

import { SigningApproval, SigningStandard } from "core/types";
import { approveItem } from "core/client";
import { useDialog } from "app/hooks/dialog";

import { allAccountsAtom } from "app/atoms";
import { withHumanDelay } from "app/utils";

import ApprovalHeader from "app/components/blocks/approvals/ApprovalHeader";
import LongTextField from "app/components/elements/LongTextField";
import Button from "app/components/elements/Button";
import { ReactComponent as SuccessIcon } from "app/icons/success.svg";
import { ReactComponent as CopyIcon } from "app/icons/copy.svg";

import ApprovalLayout from "./Layout";

const JsonView = lazy(() => import("react-json-view"));

type ApproveSigningProps = {
  approval: SigningApproval;
};

const ApproveSigning: FC<ApproveSigningProps> = ({ approval }) => {
  const allAccounts = useAtomValue(allAccountsAtom);

  const account = useMemo(
    () => allAccounts.find((acc) => acc.address === approval.accountAddress)!,
    [approval, allAccounts]
  );

  const { alert } = useDialog();

  const [initialLoading, setInitialLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 1_000);
    return () => clearTimeout(t);
  }, [setInitialLoading]);

  const handleApprove = useCallback(
    async (approved: boolean) => {
      setApproving(true);

      try {
        await withHumanDelay(async () => {
          await approveItem(approval.id, { approved });
        });
      } catch (err: any) {
        console.error(err);
        setApproving(false);

        alert({
          title: "Error",
          content: err?.message ?? "Unknown error occured",
        });
      }
    },
    [approval, setApproving, alert]
  );

  const message = useMemo(() => {
    try {
      switch (approval.standard) {
        case SigningStandard.PersonalSign:
          return ethers.utils.toUtf8String(approval.message);

        case SigningStandard.SignTypedDataV1:
          return approval.message;

        case SigningStandard.SignTypedDataV3:
        case SigningStandard.SignTypedDataV4:
          return JSON.parse(approval.message);
      }
    } catch (err) {
      console.error(err);
    }

    return null;
  }, [approval]);

  if (!message) return null;

  return (
    <ApprovalLayout
      approveText="Sign"
      onApprove={handleApprove}
      disabled={initialLoading}
      approving={approving}
      className="!pt-7"
    >
      <ApprovalHeader
        account={account}
        source={approval.source}
        signing
        className="mb-8"
      />

      <h3 className="mb-4 text-xl font-bold">
        Your signature is being requested
      </h3>

      <MessageField standard={approval.standard} message={message} />
    </ApprovalLayout>
  );
};

export default ApproveSigning;

const MessageField: FC<{ standard: SigningStandard; message: any }> = ({
  standard,
  message,
}) => {
  const { copy, copied } = useCopyToClipboard(
    typeof message === "string" ? message : JSON.stringify(message, null, 2)
  );

  const standardLabel = (
    <span className="text-xs text-brand-inactivedark2 self-end">
      {standard}
    </span>
  );

  const copyButton = (
    <Button
      theme="tertiary"
      onClick={() => copy()}
      className={classNames(
        "absolute bottom-3 right-3",
        "text-sm text-brand-light",
        "!p-0 !pr-1 !min-w-0",
        "!font-normal",
        "items-center"
      )}
    >
      {copied ? (
        <SuccessIcon className="mr-1" />
      ) : (
        <CopyIcon className="mr-1" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );

  const heightClassName = "!h-[20rem]";

  return typeof message === "string" ? (
    <LongTextField
      label="Message"
      readOnly
      textareaClassName={heightClassName}
      value={message}
      actions={[copyButton]}
      labelActions={[standardLabel]}
      hoverStyles={false}
    />
  ) : (
    <>
      <FieldLabel action={standardLabel}>Message</FieldLabel>

      <div className="relative w-full">
        <div
          className={classNames(
            "w-full",
            heightClassName,
            "py-3 px-4",
            "box-border",
            "text-sm text-brand-light",
            "bg-black/20",
            "border border-brand-main/10",
            "rounded-[.625rem]",
            "overflow-auto"
          )}
        >
          <JsonView
            src={message}
            theme="harmonic"
            iconStyle="triangle"
            name={null}
            indentWidth={3}
            collapsed={false}
            collapseStringsAfterLength={42}
            enableClipboard={false}
            displayObjectSize={false}
            displayDataTypes={false}
            style={{ backgroundColor: "none" }}
            sortKeys
          />
        </div>

        {copyButton}
      </div>
    </>
  );
};

const FieldLabel: FC<{ action?: ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between px-4 mb-2 min-h-6">
    <div className="text-base text-brand-gray cursor-pointer flex align-center">
      {children}
    </div>

    {action && (
      <>
        <span className="flex-1" />
        {action}
      </>
    )}
  </div>
);