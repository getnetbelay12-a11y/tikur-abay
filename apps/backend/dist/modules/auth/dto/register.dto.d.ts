export declare class RegisterDto {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    role: 'customer' | 'driver';
    mobileRole?: 'customer' | 'internal_driver' | 'external_driver';
    companyName?: string;
    tradeLicense?: string;
    tin?: string;
    vat?: string;
    address?: string;
    faydaFrontDocumentId?: string;
    faydaBackDocumentId?: string;
    selfieDocumentId?: string;
    licenseNumber?: string;
    emergencyContact?: string;
    branchId?: string;
    partnerCompany?: string;
    partnerVehicleCode?: string;
}
