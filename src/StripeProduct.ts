import * as pulumi from "@pulumi/pulumi";
import Stripe from "stripe";

export interface StripeProductArgs {
    apiKey: pulumi.Input<string>;
    name: pulumi.Input<string>;
    description?: pulumi.Input<string>;
    taxCode?: pulumi.Input<string>;
}

export interface StripeProductProviderArgs {
    apiKey: string;
    name: string;
    description?: string;
    taxCode?: string;
}

export class StripeProductProvider implements pulumi.dynamic.ResourceProvider {
    async create(inputs: StripeProductProviderArgs): Promise<pulumi.dynamic.CreateResult> {
        const stripe = new Stripe(inputs.apiKey);
        
        const product = await stripe.products.create({
            name: inputs.name,
            description: inputs.description,
            tax_code: inputs.taxCode,
        });
        
        return {
            id: product.id,
            outs: {
                ...inputs,
                productId: product.id,
            }
        };
    }

    async diff(id: string, olds: StripeProductProviderArgs, news: StripeProductProviderArgs): Promise<pulumi.dynamic.DiffResult> {
        const changes: string[] = [];
        
        if (olds.name !== news.name) changes.push("name");
        if (olds.description !== news.description) changes.push("description");
        if (olds.taxCode !== news.taxCode) changes.push("taxCode");
        if (olds.apiKey !== news.apiKey) changes.push("apiKey");
        
        return {
            changes: changes.length > 0,
            replaces: [], // None require replacement, all can be updated
        };
    }

    async update(id: string, olds: StripeProductProviderArgs, news: StripeProductProviderArgs): Promise<pulumi.dynamic.UpdateResult> {
        const stripe = new Stripe(news.apiKey);
        
        await stripe.products.update(id, {
            name: news.name,
            description: news.description,
            tax_code: news.taxCode,
        });

        return {
            outs: {
                ...news,
                productId: id,
            }
        };
    }

    async delete(id: string, props: StripeProductProviderArgs): Promise<void> {
        const stripe = new Stripe(props.apiKey);
        await stripe.products.update(id, { active: false });
    }
}

const stripeProductProvider = new StripeProductProvider();

export class Product extends pulumi.dynamic.Resource {
    declare public readonly productId: pulumi.Output<string>;

    constructor(name: string, args: StripeProductArgs, opts?: pulumi.CustomResourceOptions) {
        super(stripeProductProvider, name, { ...args, productId: undefined }, opts);
    }
}
