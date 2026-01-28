# Docker Container Startup Fixes

## Issues Fixed

### 1. `@nestjs/typeorm` 11.0.0 Crypto Bug
**Error:** `ReferenceError: crypto is not defined`

**Root Cause:** `@nestjs/typeorm` version 11.0.0 has a bug where it tries to use `crypto.randomUUID()` without importing the crypto module.

**Solution:** Created a patch using `patch-package` that adds the missing crypto import to the package.

**Files Changed:**
- Added patch file: `patches/@nestjs+typeorm+11.0.0.patch`
- Added postinstall script to `package.json` to auto-apply patches

### 2. `file-type` ESM-Only Package
**Error:** `Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in /app/node_modules/file-type/package.json`

**Root Cause:** `file-type` version 21.x is ESM-only and cannot be used with CommonJS (which NestJS uses by default in Node.js 18).

**Solution:** Downgraded `file-type` from `^21.1.1` to `^18.7.0` (last version with CommonJS support).

**Files Changed:**
- `package.json`: Changed file-type version
- `src/modules/documents/utils/file-type-validator.ts`: Fixed TypeScript type compatibility

## How to Apply Fixes in Docker

When you rebuild your Docker container, the fixes will be automatically applied:

1. Make sure the `patches/` directory is included in your Docker image
2. Run `npm install` or `npm ci` in your Dockerfile
3. The postinstall script will automatically apply the patch

Example Dockerfile snippet:
```dockerfile
# Copy package files
COPY package*.json ./
COPY patches ./patches

# Install dependencies
RUN npm ci --production --legacy-peer-deps

# Copy application code
COPY . .
```

## Testing

The application now starts successfully with:
- Crypto module properly available to TypeORM
- File type validation working with CommonJS-compatible file-type package
- All routes mapped correctly

## Future Considerations

- Monitor for `@nestjs/typeorm` version 11.0.1+ which should fix the crypto bug
- When upgrading to Node.js 20+, consider switching to ESM modules and using latest file-type
