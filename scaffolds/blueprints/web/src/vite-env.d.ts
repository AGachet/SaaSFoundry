/// <reference types="vite/client" />

interface ImportMeta {
  glob: (path: string, options?: { eager: boolean; query?: string; import?: string }) => Record<string, string>
}
