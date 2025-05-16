import { ApiClient } from './api.client.mjs';
import type { IMap, IMapUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  DeleteAPIResponse,
  CreateMapRequest,
  IMapResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import { AssetsClient } from './assets.client.mjs';

/**
 * Client for interacting with maps API
 */
export class MapsClient extends ApiClient {
  private assetsClient: AssetsClient;

  constructor(params = {}) {
    super(params);
    this.assetsClient = new AssetsClient(params);
  }

  /**
   * Fetch a specific map by ID
   */
  async getMap(mapId: string): Promise<IMapResponse> {
    const response = await this.api.get<BaseAPIResponse<IMapResponse>>(`/api/maps/${mapId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get map');
    }
    if (!response.data.data) {
      throw new Error('Map not found');
    }
    return response.data.data;
  }

  /**
   * Fetch all maps
   */
  async getMaps(): Promise<IMapResponse[]> {
    const response = await this.api.get<BaseAPIResponse<IMapResponse[]>>('/api/maps');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get maps');
    }
    return response.data.data;
  }

  /**
   * Create a new map
   * @param data Map data without the image
   * @param imageFile Optional image file to upload
   * @param uvttFile Optional UVTT file to use
   */
  async createMap(data: Omit<CreateMapRequest, 'image'>, imageFile?: File, uvttFile?: File): Promise<IMap> {
    // Upload the image first if provided
    let imageId: string | undefined;
    
    if (imageFile) {
      try {
        // Create form data for the asset upload
        const formData = new FormData();
        formData.append('file', imageFile); // Field MUST be named 'file' for the server
        formData.append('type', 'map');
        formData.append('name', data.name + ' image');
        
        // Upload the asset
        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    console.log("Checking for UVTT file");
    
    // If a UVTT file was provided, use a different endpoint with proper content type
    if (uvttFile) {
      console.log("UVTT file found");
      try {
        // Read the UVTT file content
        const fileContent = await uvttFile.text();
        
        // Parse the UVTT data to potentially extract the image
        try {
          const uvttData = JSON.parse(fileContent);
          
          // If the UVTT has an image embedded and we don't already have an image
          if (!imageId && uvttData.image && typeof uvttData.image === 'string') {
            // Determine if the image is a data URL or just base64
            let base64Data: string;
            let mimeType = 'image/png'; // Default mime type
            
            if (uvttData.image.startsWith('data:image')) {
              // It's a data URL, extract the mime type and base64 content
              const imageData = uvttData.image;
              mimeType = imageData.split(';')[0].split(':')[1];
              base64Data = imageData.split(',')[1];
            } else {
              // It's just a base64 string, use it directly
              base64Data = uvttData.image;
            }
            
            // Convert base64 to Blob
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            
            const blob = new Blob(byteArrays, { type: mimeType });
            const imageFile = new File([blob], data.name + '.png', { type: mimeType });
            
            // Upload the extracted image
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('type', 'map');
            formData.append('name', data.name + ' image');
            
            const asset = await this.assetsClient.uploadAsset(formData);
            imageId = asset.id;
            
            // Remove the image from the UVTT data to avoid duplicate storage
            console.log("Removing image from UVTT data");
            uvttData.image = undefined;
          }
          
          // Send the modified UVTT data (or raw if we didn't modify it)
          // Use specialized endpoint for UVTT data
          const response = await this.api.post<BaseAPIResponse<IMap>>('/api/maps', 
            {
              ...data,
              ...(imageId ? { imageId } : {}),
              uvtt: uvttData
            }
          );
          
          if (!response.data || !response.data.success) {
            throw new Error(response.data?.error || 'Failed to create map from UVTT');
          }
          
          return response.data.data;
        } catch (parseError) {
          console.error('Error parsing UVTT data:', parseError);
          throw new Error('Invalid UVTT file format');
        }
      } catch (error) {
        console.error('Failed to process UVTT file:', error);
        throw new Error('Failed to process UVTT file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    // Create the map with imageId reference (regular JSON request, no UVTT)
    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };
    
    // Use regular JSON request
    const response = await this.api.post<BaseAPIResponse<IMap>>('/api/maps', mapData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to create map');
    }
    
    return response.data.data;
  }

  /**
   * Update an existing map
   * @param mapId ID of the map to update
   * @param data Map update data
   * @param imageFile Optional new image file
   */
  async updateMap(mapId: string, data: IMapUpdateData, imageFile?: File): Promise<IMap> {
    // Upload the image first if provided
    let imageId: string | undefined;
    
    if (imageFile) {
      try {
        // Create form data for the asset upload
        const formData = new FormData();
        formData.append('file', imageFile); // Field MUST be named 'file' for the server
        formData.append('type', 'map');
        formData.append('name', (data.name || 'Map') + ' image');
        
        // Upload the asset
        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    // Update the map with imageId reference
    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };
    
    // Use regular JSON request
    const response = await this.api.patch<BaseAPIResponse<IMap>>(`/api/maps/${mapId}`, mapData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to update map');
    }
    
    return response.data.data;
  }

  /**
   * Delete a map
   */
  async deleteMap(mapId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/maps/${mapId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete map');
    }
  }

  /**
   * Upload an image for a map
   */
  async uploadMapImage(mapId: string, file: File): Promise<string> {
    const response = await this.api.put<BaseAPIResponse<IMap>>(`/api/maps/${mapId}/image`, file, {
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload map image');
    }
    if (!response.data.data) {
      throw new Error('Failed to upload map image');
    }

    // The map is returned with its image ID reference
    const map = response.data.data;
    if (!map.id) {
      throw new Error('Invalid map data returned');
    }
    return map.id;
  }

  /**
   * Export a map as UVTT file
   * @param mapId ID of the map to export
   * @returns A Blob containing the UVTT file data
   */
  async exportMapAsUVTT(mapId: string): Promise<Blob> {
    const response = await this.api.get(`/api/maps/${mapId}`, {
      headers: {
        'Accept': 'application/uvtt'
      },
      responseType: 'blob'
    });
    
    // The response should be a blob with the UVTT data
    if (response.status !== 200) {
      throw new Error('Failed to export map as UVTT');
    }
    
    return new Blob([response.data], { type: 'application/uvtt' });
  }
}
