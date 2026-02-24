export const borders = {
  thin: 1,
  regular: 1.5,
  thick: 2,
  heavy: 4,
} as const;

export type Borders = typeof borders;
