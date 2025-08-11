# PIXI.js Texture Loading Issue Investigation

## Issue Summary
**Date**: August 11, 2025  
**Problem**: PIXI.js `PIXI.Assets.load()` hanging indefinitely, causing 15-20 second delays in map and token loading  
**Status**: Resolved with HTMLImageElement workaround  

## Symptoms
- Map backgrounds showing "Loading Map..." spinner for 15-20 seconds
- Tokens not appearing on the map despite being created in game state
- No error messages - `PIXI.Assets.load()` promises never resolved or rejected
- Images loaded successfully (200 OK responses) but PIXI couldn't process them

## Root Cause Analysis

### Most Likely Cause: Recent Browser Update
**Primary suspect**: Browser auto-update (Chrome/Safari/Firefox) that changed:
- Blob URL handling policies
- CORS security restrictions  
- Internal browser APIs that PIXI.js depends on

**Evidence supporting browser update theory**:
1. **Timeline**: System worked perfectly for months until August 10, 2025
2. **Sudden onset**: No code changes preceded the issue
3. **HTMLImageElement works**: Same URLs load fine with native browser image loading
4. **PIXI-specific**: Only PIXI.js asset loading pipeline affected

### PIXI.js Version Details
- **Version**: 8.0.0 (major version with rewritten asset loading system)
- **Asset Loading**: Uses new `PIXI.Assets` API (replaced older `PIXI.Loader`)
- **Complexity**: PIXI's asset loading involves blob URL management, caching, internal processing

### Technical Details
**What fails**: `PIXI.Assets.load(imageUrl)` hangs indefinitely  
**What works**: `HTMLImageElement` + `PIXI.Texture.from(img)`  
**Images**: Load successfully with 200 OK responses  
**Processing**: PIXI's internal blob URL/texture processing pipeline breaks

## Resolution

### Implemented Solution
Replaced timeout/fallback approach with **direct HTMLImageElement loading**:

**Before (problematic)**:
```typescript
// 15-20 second timeout, then fallback
const texture = await Promise.race([
  PIXI.Assets.load(imageUrl),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 20000)
  )
]);
```

**After (solution)**:
```typescript  
// Direct HTMLImageElement approach
private async loadTextureWithTimeout(imageUrl: string): Promise<PIXI.Texture> {
  return this.loadTextureFromHTMLImage(imageUrl);
}

private async loadTextureFromHTMLImage(imageUrl: string): Promise<PIXI.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(PIXI.Texture.from(img));
    img.onerror = reject;
    img.src = imageUrl;
  });
}
```

### Files Modified
- `packages/web/src/services/encounter/PixiMapRenderer.mts`
- `packages/web/src/services/encounter/TokenRenderer.mts`

### Performance Results
- **Before**: 15-20 second delays
- **After**: Immediate loading (< 1 second)
- **Functionality**: Fully preserved
- **Reliability**: More stable (browser-native loading)

## Future Considerations

### Long-term Strategy
1. **Monitor PIXI.js updates**: Watch for fixes to asset loading issues
2. **Browser compatibility**: Track browser update impact on PIXI.js
3. **Consider staying with HTMLImageElement**: Often preferred approach in production

### Alternative Solutions (if needed)
1. **Downgrade PIXI.js**: Revert to v7.x with older loading system
2. **PIXI configuration**: Try different asset loading settings
3. **Polyfills**: Add compatibility layers for browser API changes

### Prevention
1. **Pin browser versions** in CI/CD for testing
2. **Monitor PIXI.js GitHub** for related issues
3. **Test across browsers** regularly

## Technical Notes

### HTMLImageElement Advantages
- **Browser-native**: Uses standard web APIs
- **More predictable**: Simpler loading pipeline  
- **Better error handling**: Clear success/failure states
- **Cross-browser compatible**: Widely supported
- **Performance**: Often faster than complex asset loaders

### PIXI.js Asset Loading Complexity
- Blob URL creation and management
- Internal caching systems
- Format detection and conversion
- Security policy compliance
- Cross-origin handling

This incident demonstrates why many production PIXI.js applications use HTMLImageElement for texture loading instead of the built-in asset system.

---
*This document serves as a reference for future similar issues and demonstrates the investigation process for complex frontend compatibility problems.*