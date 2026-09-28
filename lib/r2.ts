import 'server-only';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const;
export function r2Ready() { return required.every(name => Boolean(process.env[name])); }
function client() { return new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, forcePathStyle: true, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } }); }
export async function signR2Upload(key: string, contentType: string) { return getSignedUrl(client(), new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, ContentType: contentType }), { expiresIn: 900 }); }
export async function signR2Read(key: string) { return getSignedUrl(client(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }), { expiresIn: 300 }); }
