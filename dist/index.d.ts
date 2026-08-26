import * as pulumi from "@pulumi/pulumi";
interface StripePaymentLinkArgs {
    apiKey: pulumi.Input<string>;
    priceId: pulumi.Input<string>;
    sparksAmount: pulumi.Input<string>;
}
export declare class PaymentLink extends pulumi.dynamic.Resource {
    readonly url: pulumi.Output<string>;
    readonly paymentLinkId: pulumi.Output<string>;
    constructor(name: string, args: StripePaymentLinkArgs, opts?: any);
}
export {};
