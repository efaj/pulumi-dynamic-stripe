import * as pulumi from "@pulumi/pulumi";
// @ts-ignore
import Stripe from "stripe";

interface StripePaymentLinkArgs {
    apiKey: pulumi.Input<string>;
    priceId: pulumi.Input<string>;
    sparksAmount: pulumi.Input<string>;
    redirectUrl: pulumi.Input<string>;
    allowPromotionCodes?: pulumi.Input<boolean>;
}

interface StripePaymentLinkProviderArgs {
    apiKey: string;
    priceId: string;
    sparksAmount: string;
    redirectUrl: string;
    allowPromotionCodes?: boolean;
}

class StripePaymentLinkProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripePaymentLinkProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey, { apiVersion: '2022-11-15' as any }); // Using older API version to avoid typings mismatch if any
        
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [{
                price: inputs.priceId,
                quantity: 1,
                adjustable_quantity: {
                    enabled: true,
                    minimum: 1,
                    maximum: 100,
                },
            }],
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: inputs.redirectUrl,
                }
            },
            allow_promotion_codes: inputs.allowPromotionCodes,
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

const stripePaymentLinkProvider = new StripePaymentLinkProvider();

export class PaymentLink extends pulumi.dynamic.Resource {
    declare public readonly url: pulumi.Output<string>;
    declare public readonly paymentLinkId: pulumi.Output<string>;

    constructor(name: string, args: StripePaymentLinkArgs, opts?: any) {
        super(stripePaymentLinkProvider, name, {
            apiKey: args.apiKey,
            priceId: args.priceId,
            sparksAmount: args.sparksAmount,
            redirectUrl: args.redirectUrl,
            allowPromotionCodes: args.allowPromotionCodes,
            paymentLinkId: undefined,
            url: undefined,
        }, opts);
    }
}

interface StripeProductArgs {
    apiKey: pulumi.Input<string>;
    name: pulumi.Input<string>;
    description?: pulumi.Input<string>;
}

interface StripeProductProviderArgs {
    apiKey: string;
    name: string;
    description?: string;
}

class StripeProductProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripeProductProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey, { apiVersion: '2022-11-15' as any });
        
        const product = await stripe.products.create({
            name: inputs.name,
            description: inputs.description,
        });
        
        return {
            id: product.id,
            outs: {
                ...inputs,
                productId: product.id,
            }
        };
    }

    async update(id: string, olds: StripeProductProviderArgs, news: StripeProductProviderArgs): Promise<pulumi.dynamic.UpdateResult> {
        const stripe = new Stripe(news.apiKey, { apiVersion: '2022-11-15' as any });
        
        await stripe.products.update(id, {
            name: news.name,
            description: news.description,
        });

        return {
            outs: {
                ...news,
                productId: id,
            }
        };
    }

    async delete(id: string, props: StripeProductProviderArgs): Promise<void> {
        const stripe = new Stripe(props.apiKey, { apiVersion: '2022-11-15' as any });
        await stripe.products.update(id, { active: false });
    }
}

export class Product extends pulumi.dynamic.Resource {
    declare public readonly productId: pulumi.Output<string>;

    constructor(name: string, args: StripeProductArgs, opts?: any) {
        super(new StripeProductProvider(), name, { ...args, productId: undefined }, opts);
    }
}

interface StripePriceArgs {
    apiKey: pulumi.Input<string>;
    productId: pulumi.Input<string>;
    unitAmount: pulumi.Input<number>;
    currency: pulumi.Input<string>;
}

interface StripePriceProviderArgs {
    apiKey: string;
    productId: string;
    unitAmount: number;
    currency: string;
}

class StripePriceProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripePriceProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey, { apiVersion: '2022-11-15' as any });
        
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

    async delete(id: string, props: StripePriceProviderArgs): Promise<void> {
        const stripe = new Stripe(props.apiKey, { apiVersion: '2022-11-15' as any });
        await stripe.prices.update(id, { active: false });
    }
}

export class Price extends pulumi.dynamic.Resource {
    declare public readonly priceId: pulumi.Output<string>;

    constructor(name: string, args: StripePriceArgs, opts?: any) {
        super(new StripePriceProvider(), name, { ...args, priceId: undefined }, opts);
    }
}
