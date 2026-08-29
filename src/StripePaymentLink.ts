import * as pulumi from "@pulumi/pulumi";
import Stripe from "stripe";
import { safeDeactivateStripeResource } from "./utils";

export interface StripePaymentLinkArgs {
	apiKey: pulumi.Input<string>;
	priceId: pulumi.Input<string>;
	redirectUrl: pulumi.Input<string>;
	metadata?: pulumi.Input<Record<string, string>>;
	allowPromotionCodes?: pulumi.Input<boolean>;
	managedPayments?: pulumi.Input<boolean>;
	automaticTax?: pulumi.Input<boolean>;
	quantity?: pulumi.Input<number>;
	adjustableQuantity?: pulumi.Input<{
		enabled: boolean;
		minimum?: number;
		maximum?: number;
	}>;
}

export interface StripePaymentLinkProviderArgs {
	apiKey: string;
	priceId: string;
	redirectUrl: string;
	metadata?: Record<string, string>;
	allowPromotionCodes?: boolean;
	managedPayments?: boolean;
	automaticTax?: boolean;
	quantity?: number;
	adjustableQuantity?: { enabled: boolean; minimum?: number; maximum?: number };
}

export class StripePaymentLinkProvider
	implements pulumi.dynamic.ResourceProvider
{
	async create(
		inputs: StripePaymentLinkProviderArgs,
	): Promise<pulumi.dynamic.CreateResult> {
		const stripe = new Stripe(inputs.apiKey);

		const paymentLink = await stripe.paymentLinks.create({
			line_items: [
				{
					price: inputs.priceId,
					quantity: inputs.quantity ?? 1,
					...(inputs.adjustableQuantity !== undefined
						? inputs.adjustableQuantity.enabled
							? { adjustable_quantity: inputs.adjustableQuantity }
							: {}
						: {
								adjustable_quantity: {
									enabled: true,
									minimum: 1,
									maximum: 100,
								},
							}),
				},
			],
			after_completion: {
				type: "redirect",
				redirect: {
					url: inputs.redirectUrl,
				},
			},
			allow_promotion_codes: inputs.allowPromotionCodes,
			...(inputs.managedPayments
				? { managed_payments: { enabled: true } }
				: {}),
			...(inputs.automaticTax ? { automatic_tax: { enabled: true } } : {}),
			...(inputs.metadata ? { metadata: inputs.metadata } : {}),
		});

		return {
			id: paymentLink.id,
			outs: {
				...inputs,
				paymentLinkId: paymentLink.id,
				url: paymentLink.url,
			},
		};
	}

	async diff(
		_id: string,
		olds: StripePaymentLinkProviderArgs,
		news: StripePaymentLinkProviderArgs,
	): Promise<pulumi.dynamic.DiffResult> {
		const replaces: string[] = [];

		if (olds.priceId !== news.priceId) replaces.push("priceId");
		if (JSON.stringify(olds.metadata) !== JSON.stringify(news.metadata))
			replaces.push("metadata");
		if (olds.redirectUrl !== news.redirectUrl) replaces.push("redirectUrl");
		if (olds.allowPromotionCodes !== news.allowPromotionCodes)
			replaces.push("allowPromotionCodes");
		if (olds.managedPayments !== news.managedPayments)
			replaces.push("managedPayments");
		if (olds.automaticTax !== news.automaticTax) replaces.push("automaticTax");
		if (olds.apiKey !== news.apiKey) replaces.push("apiKey");
		if (olds.quantity !== news.quantity) replaces.push("quantity");
		if (
			JSON.stringify(olds.adjustableQuantity) !==
			JSON.stringify(news.adjustableQuantity)
		)
			replaces.push("adjustableQuantity");

		return {
			changes: replaces.length > 0,
			replaces,
		};
	}

	async delete(
		id: string,
		props: StripePaymentLinkProviderArgs,
	): Promise<void> {
		await safeDeactivateStripeResource(
			"StripePaymentLinkProvider",
			id,
			props.apiKey,
			async (stripe) => {
				await stripe.paymentLinks.update(id, { active: false });
			},
		);
	}
}

const stripePaymentLinkProvider = new StripePaymentLinkProvider();

export class PaymentLink extends pulumi.dynamic.Resource {
	public declare readonly url: pulumi.Output<string>;
	public declare readonly paymentLinkId: pulumi.Output<string>;

	constructor(
		name: string,
		args: StripePaymentLinkArgs,
		opts?: pulumi.CustomResourceOptions,
	) {
		super(
			stripePaymentLinkProvider,
			name,
			{
				apiKey: args.apiKey,
				priceId: args.priceId,
				redirectUrl: args.redirectUrl,
				metadata: args.metadata,
				allowPromotionCodes: args.allowPromotionCodes,
				managedPayments: args.managedPayments,
				automaticTax: args.automaticTax,
				quantity: args.quantity,
				adjustableQuantity: args.adjustableQuantity,
				paymentLinkId: undefined,
				url: undefined,
			},
			opts,
		);
	}
}
