/**
 * The precise shape of plain data once it has crossed the boundary. A recursive type rather than
 * `unknown`, because a config document can hold exactly these and nothing else.
 */
export type Value =
  | string
  | number
  | boolean
  | null
  | readonly Value[]
  | { readonly [key: string]: Value };
