declare module '@op-engineering/op-sqlite' {
  export function open(options: { name: string; location?: string }): any;
}
