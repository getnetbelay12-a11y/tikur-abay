"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentRequirementState = documentRequirementState;
exports.documentPolicyFor = documentPolicyFor;
exports.documentCategoryLabel = documentCategoryLabel;
exports.listDocumentPolicies = listDocumentPolicies;
exports.documentMobileCanUpload = documentMobileCanUpload;
const documentPolicyEntries = [
    { category: 'fayda_front', label: 'Fayda ID Front', entityTypes: ['driver_kyc'], mobileUpload: true, displayOrder: 10, priority: 'high', group: 'Identity', groupOrder: 10 },
    { category: 'fayda_back', label: 'Fayda ID Back', entityTypes: ['driver_kyc'], mobileUpload: true, displayOrder: 20, priority: 'high', group: 'Identity', groupOrder: 10 },
    { category: 'driver_license', label: 'Driver License', entityTypes: ['driver_kyc'], mobileUpload: true, displayOrder: 30, priority: 'high', group: 'Driving Approval', groupOrder: 20 },
    { category: 'license', label: 'License', entityTypes: ['driver_kyc'], mobileUpload: true, displayOrder: 40, priority: 'medium', group: 'Driving Approval', groupOrder: 20 },
    { category: 'trade_license', label: 'Trade License', entityTypes: ['customer'], mobileUpload: true, displayOrder: 10, priority: 'high', group: 'Legal', groupOrder: 10 },
    { category: 'tin_certificate', label: 'TIN Certificate', entityTypes: ['customer'], mobileUpload: true, displayOrder: 20, priority: 'high', group: 'Legal', groupOrder: 10 },
    { category: 'cargo_manifest', label: 'Cargo Manifest', entityTypes: ['customer'], mobileUpload: true, displayOrder: 30, priority: 'medium', group: 'Shipment', groupOrder: 20 },
    { category: 'agreement', label: 'Agreement', entityTypes: ['customer'], mobileUpload: true, displayOrder: 40, priority: 'medium', group: 'Commercial', groupOrder: 30 },
    { category: 'invoice', label: 'Invoice', entityTypes: ['customer'], mobileUpload: true, displayOrder: 50, priority: 'low', group: 'Commercial', groupOrder: 30 },
    { category: 'receipt', label: 'Receipt', entityTypes: ['customer'], mobileUpload: true, displayOrder: 60, priority: 'low', group: 'Commercial', groupOrder: 30 },
    { category: 'proof_of_delivery', label: 'Proof of Delivery', entityTypes: ['trip'], mobileUpload: true, displayOrder: 10, priority: 'high', group: 'Trip Completion', groupOrder: 10 },
    { category: 'trip_document', label: 'Trip Document', entityTypes: ['trip'], mobileUpload: false, displayOrder: 20, priority: 'medium', group: 'Trip Completion', groupOrder: 10 },
    { category: 'expense_receipt', label: 'Driver Expense Receipt', entityTypes: ['trip'], mobileUpload: true, displayOrder: 30, priority: 'high', group: 'Trip Finance', groupOrder: 20 },
    { category: 'empty_return_interchange', label: 'Empty Return Interchange', entityTypes: ['trip'], mobileUpload: true, displayOrder: 40, priority: 'medium', group: 'Trip Finance', groupOrder: 20 },
    { category: 'photo', label: 'Photo', mobileUpload: false, displayOrder: 100, priority: 'low', group: 'General', groupOrder: 99 },
    { category: 'document', label: 'Document', mobileUpload: false, displayOrder: 999, priority: 'low', group: 'General', groupOrder: 99 },
];
function normalize(value) {
    return String(value || '').toLowerCase();
}
function documentRequirementState(status) {
    const normalized = normalize(status || 'available');
    if (['pending_upload', 'missing', 'required', 'rejected'].includes(normalized))
        return 'required';
    if (normalized === 'uploaded')
        return 'uploaded';
    if (normalized === 'available')
        return 'available';
    return normalized;
}
function documentPolicyFor(entityType, category) {
    const normalizedEntity = normalize(entityType);
    const normalizedCategory = normalize(category || 'document');
    return (documentPolicyEntries.find((entry) => {
        if (entry.category !== normalizedCategory)
            return false;
        if (!entry.entityTypes || entry.entityTypes.length === 0)
            return true;
        return entry.entityTypes.includes(normalizedEntity);
    }) ||
        documentPolicyEntries.find((entry) => entry.category === normalizedCategory) ||
        {
            category: normalizedCategory || 'document',
            label: humanizeCategory(normalizedCategory || 'document'),
            mobileUpload: false,
            displayOrder: 999,
            priority: 'low',
            group: 'General',
            groupOrder: 99,
        });
}
function documentCategoryLabel(entityType, category) {
    return documentPolicyFor(entityType, category).label;
}
function listDocumentPolicies(filters) {
    const normalizedEntity = normalize(filters?.entityType);
    return documentPolicyEntries.filter((entry) => {
        if (filters?.mobileUploadOnly && !entry.mobileUpload) {
            return false;
        }
        if (!normalizedEntity) {
            return true;
        }
        if (!entry.entityTypes || entry.entityTypes.length === 0) {
            return false;
        }
        return entry.entityTypes.includes(normalizedEntity);
    }).sort((left, right) => left.displayOrder - right.displayOrder);
}
function documentMobileCanUpload(entityType, category, status) {
    const normalizedStatus = normalize(status);
    if (['pending_upload', 'required', 'missing', 'rejected'].includes(normalizedStatus)) {
        return true;
    }
    return documentPolicyFor(entityType, category).mobileUpload;
}
function humanizeCategory(value) {
    return value
        .split('_')
        .filter((part) => part.length > 0)
        .map((part) => `${part[0].toUpperCase()}${part.substring(1)}`)
        .join(' ');
}
//# sourceMappingURL=document-policy.js.map