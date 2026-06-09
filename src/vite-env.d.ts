/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DASHSCOPE_API_KEY: string;
  readonly VITE_SEGMENT_X_AK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
