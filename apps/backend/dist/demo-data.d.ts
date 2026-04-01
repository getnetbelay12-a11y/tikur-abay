export type DemoRole = 'super_admin' | 'executive' | 'operations_manager' | 'dispatcher' | 'technical_manager' | 'marketing_officer' | 'finance_officer' | 'hr_officer' | 'customer' | 'driver';
export type DemoUser = {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    password: string;
    role: DemoRole;
    permissions: string[];
    branch: string;
    branchId: string;
    status: 'active' | 'inactive' | 'suspended';
    customerCode?: string;
};
export declare const demoUsers: DemoUser[];
export declare const dashboardSummary: {
    fleetActive: number;
    tripsInTransit: number;
    delayedTrips: number;
    vehiclesInDjibouti: number;
    maintenanceDue: number;
    tireInspectionDue: number;
    fuelRequests: number;
    unresolvedFieldReports: number;
    overdueMaintenanceItems: number;
    outstandingInvoices: number;
};
export declare const dashboardWidgets: {
    key: string;
    label: string;
    value: number;
}[];
export declare const fleetTrackingPoints: {
    vehicleId: string;
    tripId: string;
    branch: string;
    routeName: string;
    tripStatus: string;
    vehicleStatus: string;
    latestGpsAt: string;
    latitude: number;
    longitude: number;
    geofence: string;
    offline: boolean;
}[];
export declare const maintenanceRules: {
    serviceItemName: string;
    intervalKm: number;
    intervalDays: number;
    criticalFlag: boolean;
    notificationDaysBeforeDue: number;
    blockTripAssignmentIfOverdue: boolean;
}[];
export declare const vehiclesDueForMaintenance: {
    vehicleId: string;
    vehicleLabel: string;
    branch: string;
    maintenanceType: string;
    dueKm: number;
    currentOdometerKm: number;
    overdue: boolean;
    blockedForAssignment: boolean;
    dueDate: string;
}[];
export declare const maintenanceWidgetData: {
    dueCount: number;
    tireInspectionDue: number;
    overdueCount: number;
    blockedAssignments: number;
    fuelRequests: number;
    accidentReports: number;
    obstacleReports: number;
    unresolvedFieldReports: number;
};
export declare const driverPerformance: {
    driverId: string;
    name: string;
    branch: string;
    score: number;
    tripsCompleted: number;
    onTimeDeliveryRate: number;
    delayCount: number;
    accidentCount: number;
    breakdownInvolvement: number;
    fuelRequestFrequency: number;
    documentUploadCompliance: number;
    podSubmissionCompliance: number;
    alertResponseTimeMinutes: number;
    incidentReportingQuality: number;
}[];
export declare const employeePerformance: ({
    employeeId: string;
    name: string;
    branch: string;
    role: string;
    score: number;
    tripAssignmentSpeedMinutes: number;
    delayedTripHandlingMinutes: number;
    unresolvedFieldReports: number;
    customerResponseMinutes: number;
    tripClosureAccuracy: number;
    maintenanceCompletionHours?: undefined;
    overdueMaintenanceCount?: undefined;
    repeatRepairCount?: undefined;
    sparePartConsumptionAccuracy?: undefined;
} | {
    employeeId: string;
    name: string;
    branch: string;
    role: string;
    score: number;
    maintenanceCompletionHours: number;
    overdueMaintenanceCount: number;
    repeatRepairCount: number;
    sparePartConsumptionAccuracy: number;
    tripAssignmentSpeedMinutes?: undefined;
    delayedTripHandlingMinutes?: undefined;
    unresolvedFieldReports?: undefined;
    customerResponseMinutes?: undefined;
    tripClosureAccuracy?: undefined;
})[];
export declare const employeePerformanceMetrics: {
    employeeId: string;
    name: string;
    role: string;
    department: string;
    branch: string;
    branchId: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    loadsHandled: number;
    tripsHandled: number;
    customersHandled: number;
    agreementsHandled: number;
    paymentsHandled: number;
    issuesResolved: number;
    avgResponseMinutes: number;
    performanceScore: number;
}[];
export declare const driverPerformanceMetrics: {
    driverId: string;
    name: string;
    vehicle: string;
    vehicleId: string;
    branch: string;
    branchId: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    tripsCompleted: number;
    loadsCompleted: number;
    customersServed: number;
    onTimeDeliveries: number;
    delayedTrips: number;
    accidentCount: number;
    breakdownCount: number;
    fuelRequestCount: number;
    maintenanceReportCount: number;
    podComplianceRate: number;
    documentComplianceRate: number;
    performanceScore: number;
}[];
export declare const employeePerformanceActivities: {
    readonly 'e-op-1': readonly [{
        readonly id: "act-1";
        readonly title: "Closed delayed Djibouti trip";
        readonly at: "2026-03-11T10:30:00Z";
        readonly type: "trip_closure";
    }, {
        readonly id: "act-2";
        readonly title: "Resolved customer escalation";
        readonly at: "2026-03-10T14:00:00Z";
        readonly type: "issue_resolution";
    }];
    readonly 'e-hr-1': readonly [{
        readonly id: "act-3";
        readonly title: "Processed March payroll references";
        readonly at: "2026-03-10T09:00:00Z";
        readonly type: "payroll";
    }];
    readonly 'e-mkt-1': readonly [{
        readonly id: "act-4";
        readonly title: "Converted quote to agreement";
        readonly at: "2026-03-09T16:20:00Z";
        readonly type: "agreement";
    }];
};
export declare const employeeHandledCustomers: {
    readonly 'e-op-1': readonly ["Ethio Import PLC", "Horn Logistics Trading", "Dire Freight Export"];
    readonly 'e-hr-1': readonly ["Internal Staff Support"];
    readonly 'e-mkt-1': readonly ["Ethio Import PLC", "Dire Freight Export"];
};
export declare const employeeHandledLoads: {
    readonly 'e-op-1': readonly ["LOAD-101", "LOAD-102", "LOAD-103"];
    readonly 'e-hr-1': readonly ["PAYROLL-03"];
    readonly 'e-mkt-1': readonly ["QUOTE-201", "LOAD-221"];
};
export declare const driverTripHistory: {
    readonly u10: readonly [{
        readonly id: "t1";
        readonly tripCode: "TRIP-2026-0001";
        readonly destination: "Djibouti";
        readonly status: "completed";
    }, {
        readonly id: "t5";
        readonly tripCode: "TRIP-2026-0005";
        readonly destination: "Adama";
        readonly status: "completed";
    }];
    readonly u11: readonly [{
        readonly id: "t3";
        readonly tripCode: "TRIP-2026-0003";
        readonly destination: "Djibouti";
        readonly status: "in_transit";
    }];
    readonly u12: readonly [{
        readonly id: "t4";
        readonly tripCode: "TRIP-2026-0004";
        readonly destination: "Mojo";
        readonly status: "delayed";
    }];
};
export declare const driverCustomersServed: {
    readonly u10: readonly ["Ethio Import PLC", "Horn Logistics Trading"];
    readonly u11: readonly ["Dire Freight Export"];
    readonly u12: readonly ["Mojo Industrial Supply"];
};
export declare const driverIncidents: {
    readonly u10: readonly [{
        readonly id: "inc-1";
        readonly type: "accident";
        readonly title: "Barrier contact";
        readonly at: "2026-03-11T18:20:00Z";
    }];
    readonly u11: readonly [{
        readonly id: "inc-2";
        readonly type: "maintenance";
        readonly title: "Brake warning reported";
        readonly at: "2026-03-10T12:10:00Z";
    }];
    readonly u12: readonly [{
        readonly id: "inc-3";
        readonly type: "breakdown";
        readonly title: "Starter motor failure";
        readonly at: "2026-03-08T06:40:00Z";
    }, {
        readonly id: "inc-4";
        readonly type: "delay";
        readonly title: "Checkpoint congestion";
        readonly at: "2026-03-07T13:20:00Z";
    }];
};
export declare const trips: {
    id: string;
    tripCode: string;
    branchId: string;
    customerCode: string;
    customer: string;
    vehicle: string;
    driver: string;
    driverId: string;
    origin: string;
    destination: string;
    status: string;
    eta: string;
}[];
export declare const customers: {
    id: string;
    customerCode: string;
    companyName: string;
    status: string;
    city: string;
    branchId: string;
}[];
export declare const agreements: {
    id: string;
    agreementCode: string;
    customer: string;
    customerCode: string;
    status: string;
    version: number;
    endDate: string;
}[];
export declare const payments: {
    id: string;
    invoiceCode: string;
    customer: string;
    customerCode: string;
    amount: number;
    status: string;
}[];
export declare const tripEvents: {
    readonly t1: readonly [{
        readonly id: "te1";
        readonly title: "Assigned";
        readonly description: "Trip assigned to vehicle and driver";
        readonly at: "2026-03-10T06:20:00Z";
    }, {
        readonly id: "te2";
        readonly title: "Loaded";
        readonly description: "Cargo loading completed in Addis Ababa";
        readonly at: "2026-03-10T09:00:00Z";
    }, {
        readonly id: "te3";
        readonly title: "At Border";
        readonly description: "Galafi crossing cleared";
        readonly at: "2026-03-11T12:10:00Z";
    }, {
        readonly id: "te4";
        readonly title: "In Djibouti";
        readonly description: "Reached Djibouti terminal";
        readonly at: "2026-03-12T09:20:00Z";
    }];
    readonly t2: readonly [{
        readonly id: "te5";
        readonly title: "Assigned";
        readonly description: "Trip created and dispatched";
        readonly at: "2026-03-11T08:15:00Z";
    }];
    readonly t3: readonly [{
        readonly id: "te6";
        readonly title: "In Transit";
        readonly description: "Departed Dire Dawa branch";
        readonly at: "2026-03-12T05:30:00Z";
    }];
};
export declare const documents: {
    id: string;
    title: string;
    entityType: string;
    entityId: string;
    category: string;
    status: string;
    fileName: string;
}[];
export declare const chatRooms: {
    id: string;
    roomType: string;
    title: string;
    tripId: string;
    unreadCount: number;
}[];
export declare const chatMessages: {
    id: string;
    roomId: string;
    senderName: string;
    senderUserId: string;
    text: string;
    createdAt: string;
    ownMessage: boolean;
}[];
export declare const appNotifications: {
    id: string;
    userId: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string;
    isRead: boolean;
}[];
export declare const driverReports: {
    id: string;
    type: string;
    tripId: string;
    vehicleId: string;
    driverId: string;
    location: string;
    odometerKm: number;
    urgency: string;
    description: string;
    attachments: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
}[];
export declare const maintenanceNotifications: ({
    id: string;
    vehicleId: string;
    driverId: string;
    maintenanceType: string;
    dueKm: number;
    dueDate: string;
    message: string;
    status: string;
    sentBy: string;
    sentAt: string;
    readAt: null;
    createdAt: string;
    updatedAt: string;
} | {
    id: string;
    vehicleId: string;
    driverId: string;
    maintenanceType: string;
    dueKm: number;
    dueDate: string;
    message: string;
    status: string;
    sentBy: string;
    sentAt: string;
    readAt: string;
    createdAt: string;
    updatedAt: string;
})[];
