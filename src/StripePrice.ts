import * as pulumi from "@pulumi/pulumi";
import Stripe from "stripe";

export interface StripePriceArgs {
    apiKey: pulumi.Input<string>;
    productId: pulumi.Input<string>;
    unitAmount: pulumi.Input<number>;
    currency: pulumi.Input<string>;
}

export interface StripePriceProviderArgs {
    apiKey: string;
    productId: string;
    unitAmount: number;
    currency: string;
}

export class StripePriceProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripePriceProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey);
        
        const price = await stripe.prices.create({
            product: inputs.productId,
            unit_amount: inputs.unitAmount,
            currency: inputs.currency,
        });
        
        return {
            id: price.id,
            outs: {
                ...inputs,
                priceId: price.id,
            }
        };
    }

    async diff(id: string, olds: StripePriceProviderArgs, news: StripePriceProviderArgs): Promise<pulumi.dynamic.DiffResult> {
        const replaces: string[] = [];
        
        if (olds.productId !== news.productId) replaces.push("productId");
        if (olds.unitAmount !== news.unitAmount) replaces.push("unitAmount");
        if (olds.currency !== news.currency) replaces.push("currency");
        if (olds.apiKey !== news.apiKey) replaces.push("apiKey");
        
        return {
            changes: replaces.length > 0,
            replaces,
        };
    }

    async delete(id: string, props: StripePriceProviderArgs): Promise<void> {
        const apiKey = props.apiKey || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
        if (!apiKey) {
            console.warn(`[StripePriceProvider] Skipping deletion of ${id} due to missing apiKey in state and environment variables.`);
            return;
        }
        try {
            const stripe = new Stripe(apiKey);
            await stripe.prices.update(id, { active: false });
        } catch (error) {
            console.warn(`[StripePriceProvider] Failed to deactivate price ${id}:`, error);
        }
    }
}

const stripePriceProvider = new StripePriceProvider();

export class Price extends pulumi.dynamic.Resource {
    declare public readonly priceId: pulumi.Output<string>;

    constructor(name: string, args: StripePriceArgs, opts?: pulumi.CustomResourceOptions) {
        super(stripePriceProvider, name, { ...args, priceId: undefined }, opts);
    }
}
