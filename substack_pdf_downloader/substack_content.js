console.log("Substack content script loaded");

const api = typeof chrome !== 'undefined' ? chrome : browser;

function getInvoices() {
  const rows = document.querySelectorAll('tr');
  const invoices = [];
  for (let i = 1; i < rows.length; i++) {  // Start from 1 to skip header
    const dateCell = rows[i].querySelector('td');
    if (dateCell) {
      invoices.push({
        date: dateCell.textContent.trim(),
        rowIndex: i
      });
    }
  }
  return invoices;
}

function getPublicationName() {
  const hostname = window.location.hostname;
  const match = hostname.match(/^([^.]+)\.substack\.com$/);
  return match ? match[1] : 'unknown-publication';
}

function processInvoice(invoice) {
  const rows = document.querySelectorAll('tr');
  const row = rows[invoice.rowIndex];

  if (row) {
    const actionButton = row.querySelector('button[aria-label="View more"]');
    if (actionButton) {
      actionButton.click();
      setTimeout(() => {
        const viewInvoiceLink = document.querySelector('a[href*="pay.stripe.com"]');
        if (viewInvoiceLink) {
          const publicationName = getPublicationName();
          const updatedHref = `${viewInvoiceLink.href}${viewInvoiceLink.href.includes('?') ? '&' : '?'}date=${encodeURIComponent(invoice.date)}&publication=${encodeURIComponent(publicationName)}`;
          viewInvoiceLink.href = updatedHref;
          viewInvoiceLink.setAttribute('target', '_blank');
          viewInvoiceLink.click();
        } else {
          console.error("View invoice link not found");
          api.runtime.sendMessage({ action: "downloadComplete" });
        }
      }, 1000);
    } else {
      console.error("Action button not found");
      api.runtime.sendMessage({ action: "downloadComplete" });
    }
  } else {
    console.error("Invoice row not found");
    api.runtime.sendMessage({ action: "downloadComplete" });
  }
}

api.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getInvoices") {
    sendResponse({invoices: getInvoices()});
  } else if (request.action === "processInvoice") {
    processInvoice(request.invoice);
  } else if (request.action === "allDownloadsComplete") {
    console.log("All downloads completed");
  }
});

api.runtime.sendMessage({action: "getCurrentTabId"}, function(response) {
  if (response && response.tabId) {
    api.runtime.sendMessage({action: "setSubstackTabId", tabId: response.tabId});
  }
});

console.log("Substack content script setup complete");