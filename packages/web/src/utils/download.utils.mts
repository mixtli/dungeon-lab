/**
 * Utility functions for handling file downloads
 */

/**
 * Download a blob as a file with the specified name
 *
 * @param blob - The blob to download
 * @param filename - The name of the file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the URL object
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Download a map as a UVTT/DD2VTT file
 *
 * @param mapId - The ID of the map
 * @param mapName - The name of the map (used for the filename)
 * @param mapsClient - Instance of the MapsClient
 * @param format - The format to download as ('uvtt' or 'dd2vtt', defaults to 'uvtt')
 */
export async function downloadMapAsUVTT(
  mapId: string,
  mapName: string,
  mapsClient: { exportMapAsUVTT: (mapId: string, format?: 'uvtt' | 'dd2vtt') => Promise<Blob> },
  format: 'uvtt' | 'dd2vtt' = 'uvtt'
): Promise<void> {
  try {
    // Get the UVTT blob
    const blob = await mapsClient.exportMapAsUVTT(mapId, format);

    // Sanitize the filename
    const filename = `${mapName.replace(/[^\w\s-]/gi, '')}.${format}`;

    // Download the file
    downloadBlob(blob, filename);
  } catch (error) {
    console.error(`Error downloading ${format.toUpperCase()} file:`, error);
    throw error;
  }
}

/**
 * Downloads a file from a blob
 * @param blob - The blob to download
 * @param filename - The filename to save as
 */
export function downloadFromBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Downloads a JSON file
 * @param data - The data to convert to JSON
 * @param filename - The filename to save as
 * @param indent - Number of spaces for JSON indentation
 */
export function downloadJSON<T extends Record<string, unknown>>(
  data: T,
  filename: string,
  indent = 2
): void {
  const json = JSON.stringify(data, null, indent);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFromBlob(blob, filename);
}
