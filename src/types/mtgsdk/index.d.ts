declare module 'mtgsdk' {
    export interface Card {
        name: string;
        imageUrl: string;
        manaCost: string;
        type: string;
        text: string;
    }
    export namespace card {
        export function all(filter: {name: string}): { on: (string: string, func:(card: Card) => void) => void};
    }
}