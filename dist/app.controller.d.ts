export declare const BypassInterceptor: () => MethodDecorator & ClassDecorator;
export declare class AppController {
    getAssetLinks(): {
        relation: string[];
        target: {
            namespace: string;
            package_name: string;
            sha256_cert_fingerprints: string[];
        };
    }[];
    getAppleAppSiteAssociation(): {
        applinks: {
            apps: never[];
            details: {
                appID: string;
                paths: string[];
            }[];
        };
        webcredentials: {
            apps: string[];
        };
    };
    getHello(): string;
}
