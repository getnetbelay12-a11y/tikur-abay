import { AuthenticatedUser } from '../auth/auth.types';
import { CorridorService } from '../corridor/corridor.service';
export declare class TripsController {
    private readonly corridorService;
    constructor(corridorService: CorridorService);
    private isDriverActor;
    private tripCodeScore;
    private tripStatusWeight;
    private tripUpdatedAtScore;
    list(user: AuthenticatedUser): Promise<{
        id: string;
        tripId: string;
        tripCode: any;
        shipmentCode: any;
        bookingNumber: any;
        customer: any;
        route: any;
        routeLabel: string;
        vehicle: any;
        driver: any;
        driverName: any;
        driverPhone: any;
        truckPlate: any;
        trailerPlate: any;
        status: any;
        tripStatus: any;
        dispatchStatus: any;
        eta: any;
        value: number;
        pod: boolean;
        issues: number;
        lastUpdate: any;
        branch: any;
        currentCheckpoint: any;
        origin: any;
        destination: any;
        containerNumber: any;
        sealNumber: any;
        blNumber: any;
        packingListNumber: any;
        invoiceNumber: any;
        transitDocumentNumber: any;
        delayed: boolean;
        documents: {
            type: any;
            status: any;
            fileUrl: any;
        }[];
        fuel: {
            liters: number;
            cost: number;
            station: any;
            date: any;
            receiptUrl: any;
            odometerKm: number;
        } | null;
        incidents: {
            reportCode: any;
            type: any;
            severity: any;
            status: any;
            createdAt: any;
            description: any;
        }[];
        invoice: {
            code: any;
            status: any;
            outstandingAmount: number;
            totalAmount: number;
            dueDate: any;
            href: string;
        } | null;
        timeline: {
            title: any;
            source: any;
            description: any;
            location: any;
            eventAt: any;
        }[];
    }[]>;
    latest(user: AuthenticatedUser): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getOne(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        tripCode: any;
        bookingNumber: any;
        customer: any;
        driver: any;
        driverPhone: any;
        vehicle: any;
        truckPlate: any;
        trailerPlate: any;
        route: any;
        cargo: any;
        origin: any;
        destination: any;
        status: any;
        dispatchStatus: any;
        startTime: any;
        completionTime: any;
        eta: any;
        currentCheckpoint: any;
        branch: any;
        delayedMinutes: number;
        proofOfDeliveryUploaded: boolean;
        revenueAmount: number;
        containerNumber: any;
        sealNumber: any;
        blNumber: any;
        packingListNumber: any;
        invoiceNumber: any;
        transitDocumentNumber: any;
        documents: {
            id: string;
            title: any;
            type: any;
            status: any;
            fileUrl: any;
            createdAt: any;
        }[];
        timeline: {
            id: string;
            title: any;
            source: any;
            location: any;
            note: any;
            timestamp: any;
        }[];
        incidents: {
            reportCode: any;
            type: any;
            severity: any;
            status: any;
            createdAt: any;
            description: any;
        }[];
        fuel: {
            liters: number;
            cost: number;
            station: any;
            date: any;
            receiptUrl: any;
            odometerKm: number;
        } | null;
        invoice: {
            code: any;
            status: any;
            outstandingAmount: number;
            totalAmount: number;
            dueDate: any;
        } | null;
    } | null>;
    updateStatus(id: string, body: {
        status?: string;
    }): Promise<{
        status: any;
        updatedAt: string;
        length: number;
        toString(): string;
        toLocaleString(): string;
        toLocaleString(locales: string | string[], options?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions): string;
        pop(): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | undefined;
        push(...items: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]): number;
        concat(...items: ConcatArray<import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>[]): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        concat(...items: ((import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | ConcatArray<import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>)[]): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        join(separator?: string): string;
        reverse(): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        shift(): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | undefined;
        slice(start?: number, end?: number): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        sort(compareFn?: ((a: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, b: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) => number) | undefined): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        splice(start: number, deleteCount?: number): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        splice(start: number, deleteCount: number, ...items: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        unshift(...items: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]): number;
        indexOf(searchElement: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, fromIndex?: number): number;
        lastIndexOf(searchElement: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, fromIndex?: number): number;
        every<S extends import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => value is S, thisArg?: any): this is S[];
        every(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => unknown, thisArg?: any): boolean;
        some(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => unknown, thisArg?: any): boolean;
        forEach(callbackfn: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => void, thisArg?: any): void;
        map<U>(callbackfn: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => U, thisArg?: any): U[];
        filter<S extends import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => value is S, thisArg?: any): S[];
        filter(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => unknown, thisArg?: any): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        reduce(callbackfn: (previousValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }): import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        reduce(callbackfn: (previousValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, initialValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }): import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        reduce<U>(callbackfn: (previousValue: U, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => U, initialValue: U): U;
        reduceRight(callbackfn: (previousValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }): import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        reduceRight(callbackfn: (previousValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, initialValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }): import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        reduceRight<U>(callbackfn: (previousValue: U, currentValue: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, currentIndex: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => U, initialValue: U): U;
        find<S extends import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, obj: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => value is S, thisArg?: any): S | undefined;
        find(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, obj: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => unknown, thisArg?: any): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | undefined;
        findIndex(predicate: (value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, obj: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => unknown, thisArg?: any): number;
        fill(value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, start?: number, end?: number): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        copyWithin(target: number, start: number, end?: number): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        entries(): ArrayIterator<[number, import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }]>;
        keys(): ArrayIterator<number>;
        values(): ArrayIterator<import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>;
        includes(searchElement: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, fromIndex?: number): boolean;
        flatMap<U, This = undefined>(callback: (this: This, value: import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, index: number, array: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[]) => U | readonly U[], thisArg?: This | undefined): U[];
        flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[];
        [Symbol.iterator](): ArrayIterator<import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }>;
        [Symbol.unscopables]: {
            [x: number]: boolean | undefined;
            length?: boolean | undefined;
            toString?: boolean | undefined;
            toLocaleString?: boolean | undefined;
            pop?: boolean | undefined;
            push?: boolean | undefined;
            concat?: boolean | undefined;
            join?: boolean | undefined;
            reverse?: boolean | undefined;
            shift?: boolean | undefined;
            slice?: boolean | undefined;
            sort?: boolean | undefined;
            splice?: boolean | undefined;
            unshift?: boolean | undefined;
            indexOf?: boolean | undefined;
            lastIndexOf?: boolean | undefined;
            every?: boolean | undefined;
            some?: boolean | undefined;
            forEach?: boolean | undefined;
            map?: boolean | undefined;
            filter?: boolean | undefined;
            reduce?: boolean | undefined;
            reduceRight?: boolean | undefined;
            find?: boolean | undefined;
            findIndex?: boolean | undefined;
            fill?: boolean | undefined;
            copyWithin?: boolean | undefined;
            entries?: boolean | undefined;
            keys?: boolean | undefined;
            values?: boolean | undefined;
            includes?: boolean | undefined;
            flatMap?: boolean | undefined;
            flat?: boolean | undefined;
            [Symbol.iterator]?: boolean | undefined;
            readonly [Symbol.unscopables]?: boolean | undefined;
            at?: boolean | undefined;
        };
        at(index: number): (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }) | undefined;
    } | {
        status: any;
        updatedAt: string;
        _id: unknown;
        __v: number;
    } | {
        status: any;
        updatedAt: string;
        id: string;
    }>;
    checkpointUpdate(id: string, body: {
        location?: string;
        status?: string;
        sealIntact?: boolean;
        note?: string;
        officerName?: string;
    }, user: AuthenticatedUser): Promise<any>;
    events(id: string): Promise<(import("mongoose").FlattenMaps<any> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
