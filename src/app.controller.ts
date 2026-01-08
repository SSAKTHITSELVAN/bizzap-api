// ============================================
// FILE 1: src/app.controller.ts
// Add these endpoints to serve deep linking files
// ============================================

import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController() // Hide from Swagger docs
@Controller()
export class AppController {
  
  /**
   * Serve Android Digital Asset Links
   * Endpoint: GET /.well-known/assetlinks.json
   */
  @Get('.well-known/assetlinks.json')
  @Header('Content-Type', 'application/json')
  @Header('Access-Control-Allow-Origin', '*')
  getAssetLinks() {
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
   * IMPORTANT: Replace YOUR_TEAM_ID with your actual Apple Team ID
   * Find it at: https://developer.apple.com/account (Membership section)
   */
  @Get('.well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @Header('Access-Control-Allow-Origin', '*')
  getAppleAppSiteAssociation() {
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

