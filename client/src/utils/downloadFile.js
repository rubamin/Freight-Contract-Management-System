// Triggers a browser file download from an in-memory Blob (e.g. an axios
// response with responseType: 'blob'). Extracted so this isn't duplicated
// wherever a page needs to download a generated file.
export const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
