export type MessageValue = string | { readonly [key: string]: MessageValue };
export type MessageTree = { readonly [key: string]: MessageValue };
