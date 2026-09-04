declare module "@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs" {
  export function __wbg_set_wasm(exports: unknown): void;

  export const QueryCompiler: new (options: {
    datamodel: string;
    provider: string;
    connectionInfo: Record<string, unknown>;
  }) => {
    compile(request: string): unknown;
    compileBatch(batchRequest: string): unknown;
    free(): void;
  };
}

declare module "@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs" {
  export const wasm: string;
}
