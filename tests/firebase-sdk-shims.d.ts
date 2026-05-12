declare const process: {
  env: Record<string, string | undefined>;
};

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
