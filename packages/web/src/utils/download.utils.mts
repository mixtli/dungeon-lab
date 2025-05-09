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
 * Download a map as a UVTT file
 * 
 * @param mapId - The ID of the map
 * @param mapName - The name of the map (used for the filename)
 * @param mapsClient - Instance of the MapsClient
 */
export async function downloadMapAsUVTT(
  mapId: string,
  mapName: string,
  mapsClient: any
): Promise<void> {
  try {
    // Get the UVTT blob
    const blob = await mapsClient.exportMapAsUVTT(mapId);
    
    // Sanitize the filename
    const filename = `${mapName.replace(/[^\w\s-]/gi, '')}.uvtt`;
    
    // Download the file
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error downloading UVTT file:', error);
    throw error;
  }
} 