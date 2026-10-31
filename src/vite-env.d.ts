/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSE_WASM_URL?: string;
  readonly VITE_POSE_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
