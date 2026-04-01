export declare const seededAccounts: {
    role: string;
    email: string;
    password: string;
}[];
export declare const sampleSeedData: {
    branches: {
        code: string;
        name: string;
        city: string;
        country: string;
    }[];
    vehicles: {
        plateNumber: string;
        vin: string;
        status: string;
        odometerKm: number;
        route: string;
    }[];
    customers: {
        code: string;
        companyName: string;
        contactName: string;
    }[];
    trips: {
        tripNumber: string;
        customerCode: string;
        vehiclePlate: string;
        status: string;
        isDjiboutiTrip: boolean;
    }[];
    spareParts: {
        sku: string;
        name: string;
        quantityOnHand: number;
        reorderLevel: number;
    }[];
};
