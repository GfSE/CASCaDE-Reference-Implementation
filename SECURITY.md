# Security Policy

## Known Vulnerabilities

### @xmldom/xmldom

**Status**: Critical vulnerability (CVE pending fix)

**Why we use it**:
- Required for XML parsing in Node.js environment
- Required by `saxon-js` for XSLT transformations
- No viable alternative that supports XSLT 3.0 runtime transformations

**Mitigation measures**:
1. **Input validation**: File size limits (4MB max)
2. **Input sanitization**: XML structure validation before parsing
3. **Monitoring**: Tracking upstream fixes

**Affected code**:
- `src/utils/lib/helpers.ts` - `createDOMParser()`
- `src/utils/import/ReqIF/import-reqif.ts` - ReqIF parsing
- Via `saxon-js` dependency

**Alternatives evaluated**:
- ❌ `linkedom` - Does not support XSLT transformations
- ❌ `jsdom` - Too heavy, still has dependencies
- ❌ Browser-only - Need Node.js support for testing/CI

**Action plan**:
- Monitor https://github.com/xmldom/xmldom/security/advisories
- Re-evaluate when fix is available
- Consider pre-compilation of all XSLT in future

**Last reviewed**: 2025-02-08
