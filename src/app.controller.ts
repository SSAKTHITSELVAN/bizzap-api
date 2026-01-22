import { Controller, Get, Header, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Create a custom decorator to bypass the response interceptor
export const BypassInterceptor = () => UseInterceptors();

@ApiExcludeController()
@Controller()
export class AppController {
  
  /**
   * Serve Android Digital Asset Links
   * Endpoint: GET /.well-known/assetlinks.json
   * 
   * CRITICAL: Must return raw JSON array, not wrapped response
   */
  @Get('.well-known/assetlinks.json')
  @BypassInterceptor() // Skip ResponseInterceptor
  @Header('Content-Type', 'application/json')
  @Header('Access-Control-Allow-Origin', '*')
  getAssetLinks() {
    // Return RAW array - no wrapper object
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.bizzap',
          sha256_cert_fingerprints: [
            'A1:95:79:6E:BA:59:EF:40:8F:19:F7:44:51:44:F4:3C:94:60:1C:EF:20:55:B5:C9:44:1F:17:70:9D:13:50:9E'
          ]
        }
      }
    ];
  }

  /**
   * Serve iOS Universal Links (Apple App Site Association)
   * Endpoint: GET /.well-known/apple-app-site-association
   * 
   * CRITICAL: Must return raw JSON object, not wrapped response
   * IMPORTANT: Replace YOUR_TEAM_ID with your actual Apple Team ID
   * Find it at: https://developer.apple.com/account (Membership section)
   */
  @Get('.well-known/apple-app-site-association')
  @BypassInterceptor() // Skip ResponseInterceptor
  @Header('Content-Type', 'application/json')
  @Header('Access-Control-Allow-Origin', '*')
  getAppleAppSiteAssociation() {
    // Return RAW object - no wrapper
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: 'YOUR_TEAM_ID.com.bizzap', // Replace YOUR_TEAM_ID
            paths: ['*']
          }
        ]
      },
      webcredentials: {
        apps: ['YOUR_TEAM_ID.com.bizzap'] // Replace YOUR_TEAM_ID
      }
    };
  }

  /**
   * Root endpoint (optional)
   */
  @Get()
  getHello(): string {
    return 'Bizzap API is running!';
  }
}