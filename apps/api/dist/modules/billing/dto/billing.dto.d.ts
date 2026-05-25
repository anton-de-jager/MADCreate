import { BillingInterval } from '@prisma/client';
export declare class CheckoutDto {
    workspaceId: string;
    planCode: string;
    interval?: BillingInterval;
}
export declare class PortalDto {
    workspaceId: string;
}
