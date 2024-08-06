const api = typeof chrome !== 'undefined' ? chrome : browser;

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.executeScript({file: 'substack_content.js'}, function() {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    } else {
      console.log('Substack content script injected');
      // Now that the script is injected, we can request the invoices
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getInvoices"}, function(response) {
          if (response && response.invoices) {
            // Your existing code to populate the invoice list
          }
        });
      });
    }
  });

  api.tabs.query({active: true, currentWindow: true}, function(tabs) {
    api.tabs.sendMessage(tabs[0].id, {action: "getInvoices"}, function(response) {
      if (response && response.invoices) {
        const invoiceList = document.getElementById('invoiceList');
        response.invoices.forEach(function(invoice, index) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = 'invoice' + index;
          checkbox.value = JSON.stringify(invoice);

          const label = document.createElement('label');
          label.htmlFor = 'invoice' + index;
          label.appendChild(document.createTextNode(invoice.date));

          invoiceList.appendChild(checkbox);
          invoiceList.appendChild(label);
          invoiceList.appendChild(document.createElement('br'));
        });
      }
    });
  });

  document.getElementById('downloadSelected').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('#invoiceList input[type="checkbox"]:checked');
    const selectedInvoices = Array.from(checkboxes).map(cb => JSON.parse(cb.value));

    api.runtime.sendMessage({
      action: "startDownloadQueue",
      invoices: selectedInvoices
    }, function(response) {
      document.getElementById('status').textContent = 'Download process started for ' + selectedInvoices.length + ' invoice(s).';
    });
  });

  document.getElementById('filenameTemplate').addEventListener('change', function() {
    api.runtime.sendMessage({
      action: "setFilenameTemplate",
      template: this.value
    });
  });
});