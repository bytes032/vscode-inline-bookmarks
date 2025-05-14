import * as https from 'https';
import { URL } from 'url';
import { IApiResponse, IExportData } from '../types';
import { getExtensionConfig } from '../config/settings';
import { DEFAULT_API_URL } from '../config/constants';

/**
 * Service for handling API communication
 */
export class ApiService {
  /**
   * Validates the API configuration
   * @returns An object with validation result and optional error message
   */
  public validateApiConfig(): { isValid: boolean; message?: string } {
    const config = getExtensionConfig();
    const apiUrl = config.api.url;
    const apiKey = config.api.key;
    
    if (!apiUrl || apiUrl === DEFAULT_API_URL) {
      return {
        isValid: false,
        message: 'API URL not configured. Please set bytes032-bookmarks.api.url in settings.'
      };
    }
    
    if (!apiKey) {
      return {
        isValid: false,
        message: 'API key not configured. Please set bytes032-bookmarks.api.key in settings.'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Sends bookmark data to the configured API endpoint
   * @param exportData The bookmark data to send
   * @returns A promise that resolves with the API response
   */
  public async sendBookmarks(exportData: IExportData): Promise<IApiResponse> {
    const config = getExtensionConfig();
    const apiUrl = config.api.url;
    const apiKey = config.api.key;
    
    return new Promise((resolve, reject) => {
      try {
        // Parse URL
        const urlObj = new URL(apiUrl);
        
        // Prepare request options
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          }
        };
        
        // Create request (using HTTPS only)
        const req = https.request(options, (res) => {
          let data = '';
          
          // Collect response data
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          // Handle response completion
          res.on('end', () => {
            const statusCode = res.statusCode || 0;
            if (statusCode >= 200 && statusCode < 300) {
              // Success
              resolve({
                status: statusCode,
                data: data
              });
            } else {
              // Error
              reject(new Error(`API request failed with status ${statusCode}: ${data}`));
            }
          });
        });
        
        // Handle request errors
        req.on('error', (error) => {
          reject(error);
        });
        
        // Send data
        req.write(JSON.stringify(exportData));
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}