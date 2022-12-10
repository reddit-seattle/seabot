declare module "mtgsdk" {
  export interface Card {
    name: string;
    imageUrl: string;
    manaCost: string;
    type: string;
    text: string;
  }
  export module card {
    export function all(filter: any): any;
  }
}
