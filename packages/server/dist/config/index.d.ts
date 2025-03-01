export declare const config: {
    port: string | number;
    mongoUri: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    environment: string;
    corsOrigin: string;
    clientUrl: string;
    google: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
    session: {
        secret: string;
    };
};
