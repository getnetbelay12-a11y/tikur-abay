type CollectionSchema = {
    collection: string;
    purpose: string;
    relationships?: string[];
    fields: Record<string, string>;
    indexes?: string[];
    rules?: string[];
};
export declare const schemaCatalog: CollectionSchema[];
export {};
