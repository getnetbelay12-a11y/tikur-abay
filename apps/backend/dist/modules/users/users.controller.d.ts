import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(): Promise<{
        id: string;
        firstName: any;
        lastName: any;
        name: string;
        email: any;
        phone: any;
        role: any;
        permissions: any;
        branch: any;
        branchId: string | null;
        status: any;
        employeeCode: any;
        customerCode: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
}
