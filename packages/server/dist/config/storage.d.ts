import * as Minio from 'minio';
export declare enum StorageProvider {
    MINIO = "minio",
    AWS_S3 = "aws_s3",
    GOOGLE_CLOUD = "google_cloud"
}
export declare const minioClient: Minio.Client;
export declare const bucketName: string;
export declare const ensureBucketExists: () => Promise<void>;
