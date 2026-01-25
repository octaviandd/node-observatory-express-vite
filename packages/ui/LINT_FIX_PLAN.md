# UI Package Lint Errors Fix Plan

## Summary
- **54 errors, 7 warnings** found across 33 files
- 3 categories of issues

---

## Category 1: Corrupted Spread Operator (24 files) - CRITICAL

The spread operator `{...props}` has been corrupted to `{ \n    watchers...props}` in 24 component files. This is a syntax error that breaks the build.

**Affected files:**
- `src/components/app-sidebar.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/tooltip.tsx`

**Fix:** Replace all occurrences of `{ \n    watchers...props}` with `{...props}`

---

## Category 2: React Hook Dependency Warnings (7 warnings)

Missing dependencies in useEffect hooks.

| File | Line | Missing Dependencies |
|------|------|---------------------|
| `src/hooks/useGraph.ts` | 17 | `getItems` |
| `src/components/ui/side-panel.tsx` | 79 | `getRelatedData` |
| `src/hooks/useIndexTableData.ts` | 52 | `defaultInstanceStatusType`, `index` |
| `src/hooks/useIndexTableData.ts` | 57 | `getDataByGroup`, `getDataByInstance` |
| `src/hooks/usePreviewData.ts` | 42 | `getItem` |
| `src/screens/request/view/view.tsx` | 60 | `getItem` |
| `src/screens/view/view/view.tsx` | 32 | `getItem` |

**Fix:** Wrap callback functions in `useCallback` and add them to dependency arrays, or add eslint-disable comments if intentional.

---

## Category 3: TypeScript/ESLint Errors (8 files)

### 3a. Empty interface (`src/hooks/useApi.ts:110`)
```typescript
interface UseApiMutationOptions<TData, TVariables>
  extends Omit<...> {}  // Empty interface
```
**Fix:** Change to type alias or add eslint-disable comment.

### 3b. @ts-ignore usage (`src/hooks/useGraph.ts:19`)
**Fix:** Replace `@ts-ignore` with `@ts-expect-error`.

### 3c. Unused variable (`src/store.tsx:41`)
```typescript
} catch (e) {  // 'e' is defined but never used
```
**Fix:** Rename to `_e` or remove the variable.

### 3d. Explicit `any` types (26 instances in `types.d.ts`, 1 in `main.tsx`)
**Fix:** Replace `any` with proper types or use `unknown` where appropriate.

---

## Recommended Fix Order

1. **Fix Category 1 first** - The corrupted spread operators are syntax errors that prevent the app from compiling
2. **Fix Category 3** - TypeScript errors
3. **Fix Category 2** - Hook warnings (lower priority, code still works)

---

## Estimated Changes

- **24 files** for spread operator fix (simple find-replace)
- **7 files** for hook dependency fixes
- **4 files** for TypeScript fixes (`useApi.ts`, `useGraph.ts`, `store.tsx`, `types.d.ts`, `main.tsx`)
