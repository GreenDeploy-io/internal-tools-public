const api = typeof chrome !== 'undefined' ? chrome : browser;

let substackTabId = null;
let filenameTemplate = "{date}-{publication}-stripe.pdf";
let downloadQueue = [];

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTabId") {
    sendResponse({ tabId: sender.tab.id });
  } else if (request.action === "setSubstackTabId") {
    substackTabId = request.tabId;
  } else if (request.action === "startDownloadQueue") {
    downloadQueue = request.invoices;
    processNextDownload();
  } else if (request.action === "getFilenameTemplate") {
    sendResponse({ template: filenameTemplate });
  } else if (request.action === "renameDownload") {
    api.downloads.download({
      url: request.url,
      filename: request.suggestedFilename,
      saveAs: false
    }, (downloadId) => {
      if (api.runtime.lastError) {
        console.error(api.runtime.lastError);
        sendResponse({ success: false });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  } else if (request.action === "downloadComplete") {
    api.tabs.remove(sender.tab.id, () => {
      processNextDownload();
    });
  } else if (request.action === "setFilenameTemplate") {
    filenameTemplate = request.template;
  }
});

function processNextDownload() {
  if (downloadQueue.length > 0) {
    let nextInvoice = downloadQueue.shift();
    api.tabs.sendMessage(substackTabId, {
      action: "processInvoice",
      invoice: nextInvoice
    });
  } else {
    api.tabs.sendMessage(substackTabId, { action: "allDownloadsComplete" });
  }
}