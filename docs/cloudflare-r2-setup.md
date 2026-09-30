# Cloudflare R2 booking-media setup

1. In Cloudflare, open **R2 Object Storage** and create a private bucket named `sprintnp-media`.
2. Open **Manage R2 API Tokens** and create a token with **Object Read & Write** permission scoped only to that bucket.
3. Copy the Account ID, Access Key ID, and Secret Access Key into your deployment environment:

```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=sprintnp-media
```

4. Open the bucket, select **Settings → CORS policy**, and save this bucket CORS rule. Browser uploads use short lived presigned URLs and must send the matching `Content-Type` header. Replace the production origin before deploying.

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type", "Range"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The app limits each booking video to 500 MB and issues upload URLs valid for 15 minutes. Keep the bucket private: playback is served through the authorized `/api/videos/[id]` route using a five-minute R2 read URL. Use multipart uploads before raising the app limit above 100 MB for more reliable large-video uploads.
