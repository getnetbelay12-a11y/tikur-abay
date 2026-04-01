type RequirementState = 'required' | 'uploaded' | 'available' | string;
export type DocumentPolicyEntry = {
    category: string;
    label: string;
    entityTypes?: string[];
    mobileUpload: boolean;
    displayOrder: number;
    priority: 'high' | 'medium' | 'low';
    group: string;
    groupOrder: number;
};
export declare function documentRequirementState(status: string | undefined): RequirementState;
export declare function documentPolicyFor(entityType: string | undefined, category: string | undefined): DocumentPolicyEntry;
export declare function documentCategoryLabel(entityType: string | undefined, category: string | undefined): string;
export declare function listDocumentPolicies(filters?: {
    entityType?: string;
    mobileUploadOnly?: boolean;
}): DocumentPolicyEntry[];
export declare function documentMobileCanUpload(entityType: string | undefined, category: string | undefined, status: string | undefined): boolean;
export {};
