// Avoid typescript "isolatedModules" error;
export {};

type FileEntity = {
  file: File;
  insideBackground: boolean;
  insideContent: boolean;
  locale: boolean;
};

type ChecksumSnapshot = {
  common: string;
  background: string;
  content: string;
  locales: string;
  manifest: string;
};

const RELOAD_TAB_FLAG = "__hr_reload_tab";
const SLOW_DOWN_AFTER = 5 * 60_000; // 5 min

const backgroundScripts = getBackgroundScripts();
const contentScripts = getContentScripts();

// A little hack for dev experience :)
// Listen custom event "worker_spawned", and add it to script list.
window.addEventListener<any>("worker_spawned", (evt: CustomEvent<string>) => {
  const workerScript = evt.detail;
  backgroundScripts.push(workerScript);
});

chrome.management.getSelf((self) => {
  if (self.installType === "development") {
    chrome.runtime.getPackageDirectoryEntry(watchChanges);

    // NB: see https://github.com/xpl/crx-hotreload/issues/5
    const reloadTabURL = localStorage.getItem(RELOAD_TAB_FLAG);
    if (reloadTabURL) {
      localStorage.removeItem(RELOAD_TAB_FLAG);

      queryTabs({ url: reloadTabURL }).then((tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.reload(tabs[0].id!);
        } else {
          chrome.tabs.create({ url: reloadTabURL, active: true });
        }
      });
    }
  }
});

async function watchChanges(
  dir: DirectoryEntry,
  lastChecksum?: ChecksumSnapshot,
  lastChangedAt = Date.now()
) {
  const entities = await findFiles(dir);

  const checksum: ChecksumSnapshot = {
    common: toChecksum(entities),
    background: toChecksum(entities.filter((e) => e.insideBackground)),
    content: toChecksum(entities.filter((e) => e.insideContent)),
    locales: toChecksum(entities.filter((e) => e.locale)),
    manifest: toChecksum(
      entities.filter((e) => e.file.name === "manifest.json")
    ),
  };

  if (lastChecksum && checksum.common !== lastChecksum.common) {
    try {
      if (
        checksum.content !== lastChecksum.content ||
        checksum.locales !== lastChecksum.locales ||
        checksum.manifest !== lastChecksum.manifest ||
        checksum.background !== lastChecksum.background
      ) {
        const activeTab = await getActiveMainTab();
        if (activeTab?.url)
          localStorage.setItem(RELOAD_TAB_FLAG, activeTab.url);

        chrome.runtime.reload();
      } else {
        const tabs = await queryTabs({
          url: getExtensionUrlPattern(),
        });

        // Reload extension tabs
        for (const tab of tabs) {
          chrome.tabs.reload(tab.id!);
        }
        // Reload popup
        chrome.extension.getViews({ type: "popup" }).forEach((popupWindow) => {
          popupWindow.location.reload();
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      lastChangedAt = Date.now();
    }
  }

  const retryAfter =
    Date.now() - lastChangedAt > SLOW_DOWN_AFTER ? 5_000 : 1_000;
  setTimeout(() => watchChanges(dir, checksum, lastChangedAt), retryAfter);
}

function findFiles(dir: DirectoryEntry) {
  return new Promise<FileEntity[]>((resolve) => {
    dir.createReader().readEntries((entries) => {
      Promise.all(
        entries
          .filter((entry) => entry.name[0] !== ".")
          .map((entry) =>
            entry.isDirectory
              ? findFiles(entry as DirectoryEntry)
              : new Promise((res) =>
                  (entry as FileEntry).file((file) => {
                    const insideBackground = isEntryInside(
                      entry,
                      backgroundScripts
                    );
                    const insideContent = isEntryInside(entry, contentScripts);
                    const locale = /.*\_locales.*\.json/.test(entry.fullPath);
                    res({ file, insideBackground, insideContent, locale });
                  })
                )
          )
      )
        .then((entities: any[]) => [].concat(...entities))
        .then(resolve);
    });
  });
}

function toChecksum(entities: FileEntity[]) {
  return entities.map(({ file }) => `${file.name}${file.lastModified}`).join();
}

function isEntryInside(entry: Entry, paths: string[]) {
  return paths.some((p) => entry.fullPath.endsWith(p));
}

function getBackgroundScripts() {
  return Array.from(document.scripts).map(
    (s) => s.src.split(chrome.runtime.id)[1]
  );
}

function getContentScripts() {
  const manifest = chrome.runtime.getManifest();
  const scriptSet = new Set<string>();

  if (manifest.web_accessible_resources) {
    for (const resource of manifest.web_accessible_resources) {
      if (typeof resource === "string") {
        scriptSet.add(resource);
      } else {
        resource.resources.forEach((r) => scriptSet.add(r));
      }
    }
  }

  if (manifest.content_scripts) {
    for (const contentScript of manifest.content_scripts) {
      if (contentScript.js) {
        for (const s of contentScript.js) {
          scriptSet.add(s);
        }
      }
    }
  }

  return Array.from(scriptSet);
}

async function getActiveMainTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await queryTabs({
    active: true,
    lastFocusedWindow: true,
    url: getExtensionUrlPattern("main.html"),
  });
  return tabs[0];
}

function queryTabs(params: chrome.tabs.QueryInfo) {
  return new Promise<chrome.tabs.Tab[]>((res) =>
    chrome.tabs.query(params, res)
  );
}

function getExtensionUrlPattern(path = "**") {
  return `chrome-extension://${chrome.runtime.id}/${path}`;
}
