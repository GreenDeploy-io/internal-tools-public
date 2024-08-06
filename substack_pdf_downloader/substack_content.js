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
  // Check if it's a Substack subdomain
  const subdomainMatch = window.location.hostname.match(/^([^.]+)\.substack\.com$/);
  if (subdomainMatch) {
    return subdomainMatch[1];
  }

  // If not a Substack subdomain, it's likely a custom domain
  // We'll use the hostname as the publication name
  return window.location.hostname;
}

function isSubstackReceiptPage() {
  // Check for a link to Substack's privacy policy
  const hasSubstackPrivacyLink = !!document.querySelector('a[href="https://substack.com/privacy"]');

  // Check for the "Payment & receipt history" header
  const hasPaymentHeader = Array.from(document.querySelectorAll('h2')).some(
    h2 => h2.textContent.trim() === 'Payment & receipt history'
  );

  // Return true only if both conditions are met
  return hasSubstackPrivacyLink && hasPaymentHeader;
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

if (isSubstackReceiptPage()) {
  console.log("Substack content script loaded");
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
} else {
  console.log("Not a Substack page, content script not activated");
}