import * as pulumi from "@pulumi/pulumi";
import Stripe from "stripe";
import type {
	BillingScheme,
	RecurringInterval,
	TaxBehavior,
	TiersMode,
	UsageType,
} from "./enums";
import { safeDeactivateStripeResource } from "./utils";

export interface RecurringArgs {
	interval: pulumi.Input<RecurringInterval>;
	intervalCount?: pulumi.Input<number>;
	usageType?: pulumi.Input<UsageType>;
}

export interface TierArgs {
	upTo: pulumi.Input<number | "inf">;
	unitAmount?: pulumi.Input<number>;
	flatAmount?: pulumi.Input<number>;
}

export interface TransformQuantityArgs {
	divideBy: pulumi.Input<number>;
	round: pulumi.Input<"up" | "down">;
}

export interface StripePriceArgs {
	apiKey: pulumi.Input<string>;
	productId: pulumi.Input<string>;
	currency: pulumi.Input<string>;
	unitAmount?: pulumi.Input<number>;
	taxBehavior?: pulumi.Input<TaxBehavior>;
	recurring?: pulumi.Input<RecurringArgs>;
	billingScheme?: pulumi.Input<BillingScheme>;
	tiersMode?: pulumi.Input<TiersMode>;
	tiers?: pulumi.Input<pulumi.Input<TierArgs>[]>;
	transformQuantity?: pulumi.Input<TransformQuantityArgs>;
	metadata?: pulumi.Input<Record<string, string>>;
}

export interface RecurringProviderArgs {
	interval: RecurringInterval;
	intervalCount?: number;
	usageType?: UsageType;
}

export interface TierProviderArgs {
	upTo: number | "inf";
	unitAmount?: number;
	flatAmount?: number;
}

export interface TransformQuantityProviderArgs {
	divideBy: number;
	round: "up" | "down";
}

export interface StripePriceProviderArgs {
	apiKey: string;
	productId: string;
	currency: string;
	unitAmount?: number;
	taxBehavior?: TaxBehavior;
	recurring?: RecurringProviderArgs;
	billingScheme?: BillingScheme;
	tiersMode?: TiersMode;
	tiers?: TierProviderArgs[];
	transformQuantity?: TransformQuantityProviderArgs;
	metadata?: Record<string, string>;
}

export class StripePriceProvider implements pulumi.dynamic.ResourceProvider {
	async create(
		inputs: StripePriceProviderArgs,
	): Promise<pulumi.dynamic.CreateResult> {
		const stripe = new Stripe(inputs.apiKey);

		const price = await stripe.prices.create({
			product: inputs.productId,
			currency: inputs.currency,
			...(inputs.unitAmount !== undefined
				? { unit_amount: inputs.unitAmount }
				: {}),
			tax_behavior: inputs.taxBehavior,
			...(inputs.recurring
				? {
						recurring: {
							interval: inputs.recurring.interval,
							interval_count: inputs.recurring.intervalCount,
							usage_type: inputs.recurring.usageType,
						},
					}
				: {}),
			billing_scheme: inputs.billingScheme,
			tiers_mode: inputs.tiersMode,
			...(inputs.tiers
				? {
						tiers: inputs.tiers.map((t) => ({
							up_to: t.upTo,
							unit_amount: t.unitAmount,
							flat_amount: t.flatAmount,
						})),
					}
				: {}),
			...(inputs.transformQuantity
				? {
						transform_quantity: {
							divide_by: inputs.transformQuantity.divideBy,
							round: inputs.transformQuantity.round,
						},
					}
				: {}),
			...(inputs.metadata ? { metadata: inputs.metadata } : {}),
		});

		return {
			id: price.id,
			outs: {
				...inputs,
				priceId: price.id,
			},
		};
	}

	async diff(
		_id: string,
		olds: StripePriceProviderArgs,
		news: StripePriceProviderArgs,
	): Promise<pulumi.dynamic.DiffResult> {
		const replaces: string[] = [];

		if (olds.productId !== news.productId) replaces.push("productId");
		if (olds.unitAmount !== news.unitAmount) replaces.push("unitAmount");
		if (olds.currency !== news.currency) replaces.push("currency");
		if (olds.taxBehavior !== news.taxBehavior) replaces.push("taxBehavior");
		if (JSON.stringify(olds.recurring) !== JSON.stringify(news.recurring))
			replaces.push("recurring");
		if (olds.billingScheme !== news.billingScheme)
			replaces.push("billingScheme");
		if (olds.tiersMode !== news.tiersMode) replaces.push("tiersMode");
		if (JSON.stringify(olds.tiers) !== JSON.stringify(news.tiers))
			replaces.push("tiers");
		if (
			JSON.stringify(olds.transformQuantity) !==
			JSON.stringify(news.transformQuantity)
		)
			replaces.push("transformQuantity");
		if (JSON.stringify(olds.metadata) !== JSON.stringify(news.metadata))
			replaces.push("metadata");
		if (olds.apiKey !== news.apiKey) replaces.push("apiKey");

		return {
			changes: replaces.length > 0,
			replaces,
		};
	}

	async delete(id: string, props: StripePriceProviderArgs): Promise<void> {
		await safeDeactivateStripeResource(
			"StripePriceProvider",
			id,
			props.apiKey,
			async (stripe) => {
				await stripe.prices.update(id, { active: false });
			},
		);
	}
}

const stripePriceProvider = new StripePriceProvider();

export class Price extends pulumi.dynamic.Resource {
	public declare readonly priceId: pulumi.Output<string>;

	constructor(
		name: string,
		args: StripePriceArgs,
		opts?: pulumi.CustomResourceOptions,
	) {
		super(stripePriceProvider, name, { ...args, priceId: undefined }, opts);
	}
}
