export declare class DrivingSchoolService {
    dashboard(): Promise<{
        kpis: {
            totalStudents: number;
            documentsPending: number;
            trainingInProgress: number;
            examPending: number;
            dlProcessing: number;
            unpaidBalances: number;
        };
        students: {
            id: string;
            studentCode: any;
            fullName: any;
            phone: any;
            status: any;
            progressPercent: number;
            theoryExamStatus: any;
            roadExamStatus: any;
            dlFollowUpStatus: any;
            totalFee: number;
            paidAmount: number;
            nextLessonAt: any;
            examScheduledAt: any;
        }[];
        registrationQueue: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        trainingProgress: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        exams: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        dlFollowUp: (import("mongoose").FlattenMaps<any> & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        payments: {
            recentPayments: {
                id: string;
                paymentCode: any;
                studentCode: any;
                amount: number;
                status: any;
                paidAt: any;
                method: any;
            }[];
            dueSoon: {
                id: string;
                studentCode: any;
                fullName: any;
                balance: number;
                status: any;
            }[];
        };
        documents: {
            id: string;
            studentCode: any;
            fullName: any;
            documentCount: number;
            latestDocumentAt: any;
            documentsPending: boolean;
        }[];
    }>;
}
