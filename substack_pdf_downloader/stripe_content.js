const api = typeof chrome !== 'undefined' ? chrome : browser;

function isSubstackInvoice() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('publication') && urlParams.get('publication') !== 'unknown-publication';
}

function downloadPDF() {
  if (!isSubstackInvoice()) {
    console.log("Not a Substack invoice. Allowing manual download.");
    return; // Exit the function, allowing manual downloads for non-Substack invoices
  }

  const downloadLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Download invoice');
  if (downloadLink) {
    // Only prevent default for Substack invoices
    downloadLink.addEventListener('click', function(event) {
      event.preventDefault();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date') || 'unknown-date';
    const publication = urlParams.get('publication') || 'unknown-publication';

    api.runtime.sendMessage({
      action: "getFilenameTemplate"
    }, (response) => {
      const filenameTemplate = response.template || '{date}-{publication}-stripe.pdf';
      const suggestedFilename = filenameTemplate
        .replace('{date}', date)
        .replace('{publication}', publication);

      api.runtime.sendMessage({
        action: "renameDownload",
        url: downloadLink.href,
        suggestedFilename: suggestedFilename
      }, (renameResponse) => {
        if (renameResponse && renameResponse.success) {
          console.log("File will be renamed to:", suggestedFilename);
        } else {
          console.log("File will be downloaded with original name");
        }

        setTimeout(() => {
          api.runtime.sendMessage({ action: "downloadComplete" });
        }, 2000);
      });
    });
  } else {
    console.error("Download invoice link not found");
    api.runtime.sendMessage({ action: "downloadComplete" });
  }
}


// Wait for the page to load before running the script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', downloadPDF);
} else {
  downloadPDF();
}