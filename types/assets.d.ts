// `moduleResolution: bundler` does not resolve style side-effect imports on its
// own; Next.js handles them at build time.
declare module "*.css";
