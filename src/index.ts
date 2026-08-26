import * as pulumi from "@pulumi/pulumi";
// @ts-ignore
import Stripe from "stripe";

interface StripePaymentLinkArgs {
    apiKey: pulumi.Input<string>;
    priceId: pulumi.Input<string>;
    sparksAmount: pulumi.Input<string>;
}

interface StripePaymentLinkProviderArgs {
    apiKey: string;
    priceId: string;
    sparksAmount: string;
}

class StripePaymentLinkProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripePaymentLinkProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey, { apiVersion: '2022-11-15' as any }); // Using older API version to avoid typings mismatch if any
        
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [{
                price: inputs.priceId,
                quantity: 1,
            }],
            metadata: {
                sparks: inputs.sparksAmount
            }
        });
        
        return {
            id: paymentLink.id,
            outs: {
                ...inputs,
                paymentLinkId: paymentLink.id,
                url: paymentLink.url,
            }
        };
    }

    async delete(id: string, props: StripePaymentLinkProviderArgs): Promise<void> {
        const stripe = new Stripe(props.apiKey, { apiVersion: '2022-11-15' as any });
        // Payment links cannot be deleted, but they can be deactivated
        await stripe.paymentLinks.update(id, { active: false });
    }
}

export class PaymentLink extends pulumi.dynamic.Resource {
    public readonly url!: pulumi.Output<string>;
    public readonly paymentLinkId!: pulumi.Output<string>;

    constructor(name: string, args: StripePaymentLinkArgs, opts?: any) {
        super(new StripePaymentLinkProvider(), name, args, opts);
    }
}
