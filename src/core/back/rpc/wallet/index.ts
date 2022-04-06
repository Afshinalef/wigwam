import browser from "webextension-polyfill";
import { ethers } from "ethers";
import { nanoid } from "nanoid";
import { assert } from "superstruct";
import { getPublicURL } from "lib/ext/utils";

import { $approvals, approvalAdded } from "core/back/state";
import { ActivityType, RpcReply } from "core/types";

import { TxParamsSchema } from "./validation";

export async function sendTransaction(
  chainId: number,
  params: any[],
  rpcReply: RpcReply
) {
  const txParams = params[0];
  assert(txParams, TxParamsSchema);

  const accountAddress = ethers.utils.getAddress(txParams.from);

  approvalAdded({
    id: nanoid(),
    type: ActivityType.Transaction,
    source: { type: "self", kind: "unknown_transaction" },
    chainId,
    accountAddress,
    txParams,
    rpcReply,
  });
}

let currentWinId: number | null = null;

if ("currentWinId" in sessionStorage) {
  browser.windows.remove(+sessionStorage.currentWinId).catch(console.error);
  sessionStorage.removeItem("currentWinId");
}

approvalAdded.watch(async () => {
  if (currentWinId !== null) {
    browser.windows.update(currentWinId, { focused: true });
  } else {
    createApproveWindow().catch(console.error);
  }
});

$approvals.watch((approvals) => {
  if (currentWinId !== null && approvals.length === 0) {
    browser.windows.remove(currentWinId).catch(console.error);
  }
});

browser.windows.onRemoved.addListener((removedWinId) => {
  if (removedWinId === currentWinId) {
    currentWinId = null;
    sessionStorage.removeItem("currentWinId");
  }
});

async function createApproveWindow() {
  const width = 440;
  const height = 660;

  let left = 0;
  let top = 0;
  try {
    const lastFocused = await browser.windows.getLastFocused();
    // Position window in top right corner of lastFocused window.

    left = Math.round(lastFocused.left! + lastFocused.width! / 2 - width / 2);
    top = Math.round(lastFocused.top! + lastFocused.height! / 2 - height / 2);
  } catch {
    // The following properties are more than likely 0, due to being
    // opened from the background chrome process for the extension that
    // has no physical dimensions
    const { screenX, screenY, outerWidth, outerHeight } = window;

    left = Math.round(screenX + outerWidth / 2 - width / 2);
    top = Math.round(screenY + outerHeight / 2 - height / 2);
  }

  const win = await browser.windows.create({
    type: "popup",
    url: getPublicURL("approve.html"),
    width,
    height,
    top: Math.max(top, 20),
    left: Math.max(left, 20),
  });

  // Firefox currently ignores left/top for create, but it works for update
  if (win.id && win.left !== left && win.state !== "fullscreen") {
    await browser.windows.update(win.id, { left, top });
  }

  currentWinId = win.id!;
  sessionStorage.currentWinId = currentWinId;
}
