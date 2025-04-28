/// <reference types="svelte" />
/// <reference types="vite/client" />

// Augment the TanStack Table types
declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    displayName?: string
  }
}
