"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = exports.BypassInterceptor = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const BypassInterceptor = () => (0, common_1.UseInterceptors)();
exports.BypassInterceptor = BypassInterceptor;
let AppController = class AppController {
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
    getAppleAppSiteAssociation() {
        return {
            applinks: {
                apps: [],
                details: [
                    {
                        appID: 'YOUR_TEAM_ID.com.bizzap',
                        paths: ['*']
                    }
                ]
            },
            webcredentials: {
                apps: ['YOUR_TEAM_ID.com.bizzap']
            }
        };
    }
    getHello() {
        return 'Bizzap API is running!';
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('.well-known/assetlinks.json'),
    (0, exports.BypassInterceptor)(),
    (0, common_1.Header)('Content-Type', 'application/json'),
    (0, common_1.Header)('Access-Control-Allow-Origin', '*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getAssetLinks", null);
__decorate([
    (0, common_1.Get)('.well-known/apple-app-site-association'),
    (0, exports.BypassInterceptor)(),
    (0, common_1.Header)('Content-Type', 'application/json'),
    (0, common_1.Header)('Access-Control-Allow-Origin', '*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getAppleAppSiteAssociation", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map