import Stripe from "stripe";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	StripePaymentLinkProvider,
	StripePriceProvider,
	StripeProductProvider,
} from "../src/index";

// Mock the Stripe SDK
vi.mock("stripe");

const MockedStripe = Stripe as any;

describe("Stripe Providers", () => {
	let mockPaymentLinksCreate: Mock<any>;
	let mockPaymentLinksUpdate: Mock<any>;
	let mockProductsCreate: Mock<any>;
	let mockProductsUpdate: Mock<any>;
	let mockPricesCreate: Mock<any>;
	let mockPricesUpdate: Mock<any>;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		mockPaymentLinksCreate = vi.fn<any>().mockResolvedValue({
			id: "plink_123",
			url: "https://stripe.com/plink_123",
		} as any);
		mockPaymentLinksUpdate = vi
			.fn<any>()
			.mockResolvedValue({ id: "plink_123" } as any);

		mockProductsCreate = vi
			.fn<any>()
			.mockResolvedValue({ id: "prod_123" } as any);
		mockProductsUpdate = vi
			.fn<any>()
			.mockResolvedValue({ id: "prod_123" } as any);

		mockPricesCreate = vi
			.fn<any>()
			.mockResolvedValue({ id: "price_123" } as any);
		mockPricesUpdate = vi
			.fn<any>()
			.mockResolvedValue({ id: "price_123" } as any);

		// Setup the mocked Stripe instance's internal resource objects
		MockedStripe.mockImplementation(() => {
			return {
				paymentLinks: {
					create: mockPaymentLinksCreate,
					update: mockPaymentLinksUpdate,
				},
				products: {
					create: mockProductsCreate,
					update: mockProductsUpdate,
				},
				prices: {
					create: mockPricesCreate,
					update: mockPricesUpdate,
				},
			} as any;
		});
	});

	describe("StripePaymentLinkProvider", () => {
		const provider = new StripePaymentLinkProvider();

		describe("create", () => {
			const createCases = [
				{
					name: "all properties provided",
					inputs: {
						apiKey: "sk_test_123",
						priceId: "price_abc",
						metadata: { sparks: "100" },
						redirectUrl: "https://example.com/success",
						allowPromotionCodes: true,
						managedPayments: true,
						automaticTax: true,
					},
					expectedPayload: {
						line_items: [
							{
								price: "price_abc",
								quantity: 1,
								adjustable_quantity: {
									enabled: true,
									minimum: 1,
									maximum: 100,
								},
							},
						],
						after_completion: {
							type: "redirect",
							redirect: { url: "https://example.com/success" },
						},
						allow_promotion_codes: true,
						managed_payments: { enabled: true },
						automatic_tax: { enabled: true },
						metadata: { sparks: "100" },
					},
				},
				{
					name: "only required properties provided",
					inputs: {
						apiKey: "sk_test_123",
						priceId: "price_abc",
						metadata: { sparks: "50" },
						redirectUrl: "https://example.com/success",
					},
					expectedPayload: {
						line_items: [
							{
								price: "price_abc",
								quantity: 1,
								adjustable_quantity: {
									enabled: true,
									minimum: 1,
									maximum: 100,
								},
							},
						],
						after_completion: {
							type: "redirect",
							redirect: { url: "https://example.com/success" },
						},
						allow_promotion_codes: undefined,
						metadata: { sparks: "50" },
					},
				},
				{
					name: "custom quantity and adjustableQuantity provided",
					inputs: {
						apiKey: "sk_test_123",
						priceId: "price_abc",
						metadata: { sparks: "100" },
						redirectUrl: "https://example.com/success",
						quantity: 5,
						adjustableQuantity: { enabled: true, maximum: 5 },
					},
					expectedPayload: {
						line_items: [
							{
								price: "price_abc",
								quantity: 5,
								adjustable_quantity: { enabled: true, maximum: 5 },
							},
						],
						after_completion: {
							type: "redirect",
							redirect: { url: "https://example.com/success" },
						},
						allow_promotion_codes: undefined,
						metadata: { sparks: "100" },
					},
				},
			];

			it.each(createCases)(
				"should correctly map Pulumi inputs to Stripe API payload when $name",
				async ({ inputs, expectedPayload }) => {
					const result = await provider.create(inputs as any);

					expect(result.id).toBe("plink_123");
					expect(result.outs?.paymentLinkId).toBe("plink_123");
					expect(result.outs?.url).toBe("https://stripe.com/plink_123");

					expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
					expect(mockPaymentLinksCreate).toHaveBeenCalledWith(expectedPayload);
				},
			);
		});

		describe("diff", () => {
			const diffCases = [
				{
					name: "all properties change",
					olds: {
						priceId: "old",
						metadata: { sparks: "10" },
						redirectUrl: "url1",
						allowPromotionCodes: false,
						managedPayments: false,
						automaticTax: false,
						quantity: 1,
						adjustableQuantity: { enabled: true },
						apiKey: "old_key",
					},
					news: {
						priceId: "new",
						metadata: { sparks: "20" },
						redirectUrl: "url2",
						allowPromotionCodes: true,
						managedPayments: true,
						automaticTax: true,
						quantity: 2,
						adjustableQuantity: { enabled: false },
						apiKey: "new_key",
					},
					expectedChanges: true,
					expectedReplaces: [
						"priceId",
						"metadata",
						"redirectUrl",
						"allowPromotionCodes",
						"managedPayments",
						"automaticTax",
						"apiKey",
						"quantity",
						"adjustableQuantity",
					],
				},
				{
					name: "some properties change",
					olds: {
						priceId: "old",
						metadata: { sparks: "10" },
						redirectUrl: "url1",
					},
					news: {
						priceId: "old",
						metadata: { sparks: "20" },
						redirectUrl: "url1",
					},
					expectedChanges: true,
					expectedReplaces: ["metadata"],
				},
				{
					name: "quantity changes",
					olds: { priceId: "same", metadata: { sparks: "10" }, quantity: 1 },
					news: { priceId: "same", metadata: { sparks: "10" }, quantity: 2 },
					expectedChanges: true,
					expectedReplaces: ["quantity"],
				},
				{
					name: "adjustableQuantity changes",
					olds: {
						priceId: "same",
						metadata: { sparks: "10" },
						adjustableQuantity: { enabled: true, minimum: 1, maximum: 10 },
					},
					news: {
						priceId: "same",
						metadata: { sparks: "10" },
						adjustableQuantity: { enabled: true, minimum: 2, maximum: 10 },
					},
					expectedChanges: true,
					expectedReplaces: ["adjustableQuantity"],
				},
				{
					name: "no properties change",
					olds: { priceId: "same", metadata: { sparks: "10" } },
					news: { priceId: "same", metadata: { sparks: "10" } },
					expectedChanges: false,
					expectedReplaces: [],
				},
			];

			it.each(diffCases)(
				"should correctly detect diff when $name",
				async ({ olds, news, expectedChanges, expectedReplaces }) => {
					const diffResult = await provider.diff(
						"plink_123",
						olds as any,
						news as any,
					);
					expect(diffResult.changes).toBe(expectedChanges);
					expect(diffResult.replaces).toEqual(
						expect.arrayContaining(expectedReplaces),
					);
					expect(diffResult.replaces?.length).toBe(expectedReplaces.length);
				},
			);
		});

		describe("delete", () => {
			const deleteCases = [
				{
					name: "apiKey is in state",
					state: { apiKey: "sk_test_state" },
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_state",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_SECRET_KEY",
					state: {},
					envSecret: "sk_test_secret",
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_secret",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_API_KEY",
					state: {},
					envSecret: undefined,
					envApi: "sk_test_api",
					mockError: false,
					expectStripeInit: "sk_test_api",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing everywhere (NoOp)",
					state: {},
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: null,
					expectUpdate: false,
				},
				{
					name: "Stripe SDK throws an error (caught safely)",
					state: { apiKey: "sk_test_error" },
					envSecret: undefined,
					envApi: undefined,
					mockError: true,
					expectStripeInit: "sk_test_error",
					expectUpdate: true,
				},
			];

			it.each(deleteCases)(
				"should handle deletion when $name",
				async ({
					state,
					envSecret,
					envApi,
					mockError,
					expectStripeInit,
					expectUpdate,
				}) => {
					const originalSecret = process.env.STRIPE_SECRET_KEY;
					const originalApi = process.env.STRIPE_API_KEY;

					if (envSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = envSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (envApi !== undefined) process.env.STRIPE_API_KEY = envApi;
					else delete process.env.STRIPE_API_KEY;

					if (mockError) {
						mockPaymentLinksUpdate.mockRejectedValueOnce(
							new Error("Stripe error"),
						);
					}

					await provider.delete("plink_123", state as any);

					if (expectStripeInit) {
						expect(MockedStripe).toHaveBeenCalledWith(expectStripeInit);
					}

					if (expectUpdate) {
						expect(mockPaymentLinksUpdate).toHaveBeenCalledWith("plink_123", {
							active: false,
						});
					} else {
						expect(mockPaymentLinksUpdate).not.toHaveBeenCalled();
					}

					if (originalSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = originalSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (originalApi !== undefined)
						process.env.STRIPE_API_KEY = originalApi;
					else delete process.env.STRIPE_API_KEY;
				},
			);
		});
	});

	describe("StripeProductProvider", () => {
		const provider = new StripeProductProvider();

		describe("create", () => {
			const createCases = [
				{
					name: "all properties provided",
					inputs: {
						apiKey: "sk_test_123",
						name: "Full Product",
						description: "A complete product",
						taxCode: "txcd_123",
					},
					expectedPayload: {
						name: "Full Product",
						description: "A complete product",
						tax_code: "txcd_123",
					},
				},
				{
					name: "only required properties provided",
					inputs: {
						apiKey: "sk_test_123",
						name: "Minimal Product",
					},
					expectedPayload: {
						name: "Minimal Product",
						description: undefined,
						tax_code: undefined,
					},
				},
			];

			it.each(createCases)(
				"should correctly create a product when $name",
				async ({ inputs, expectedPayload }) => {
					const result = await provider.create(inputs as any);

					expect(result.id).toBe("prod_123");
					expect(result.outs?.productId).toBe("prod_123");

					expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
					expect(mockProductsCreate).toHaveBeenCalledWith(expectedPayload);
				},
			);
		});

		describe("diff", () => {
			const diffCases = [
				{
					name: "all properties change",
					olds: {
						name: "old name",
						description: "old desc",
						taxCode: "tx_1",
						apiKey: "old_key",
					},
					news: {
						name: "new name",
						description: "new desc",
						taxCode: "tx_2",
						apiKey: "new_key",
					},
					expectedChanges: true,
				},
				{
					name: "some properties change",
					olds: { name: "old name", description: "old desc" },
					news: { name: "old name", description: "new desc" },
					expectedChanges: true,
				},
				{
					name: "no properties change",
					olds: { name: "same name", description: "same desc" },
					news: { name: "same name", description: "same desc" },
					expectedChanges: false,
				},
			];

			it.each(diffCases)(
				"should correctly detect diff when $name",
				async ({ olds, news, expectedChanges }) => {
					const diffResult = await provider.diff(
						"prod_123",
						olds as any,
						news as any,
					);
					expect(diffResult.changes).toBe(expectedChanges);
					expect(diffResult.replaces).toHaveLength(0);
				},
			);
		});

		describe("update", () => {
			it("should correctly update a product", async () => {
				const result = await provider.update(
					"prod_123",
					{ apiKey: "sk_test_123", name: "Old Name" } as any,
					{
						apiKey: "sk_test_123",
						name: "New Name",
						description: "New Desc",
						taxCode: "txcd_999",
					} as any,
				);

				expect(result.outs?.productId).toBe("prod_123");
				expect(result.outs?.name).toBe("New Name");

				expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", {
					name: "New Name",
					description: "New Desc",
					tax_code: "txcd_999",
				});
			});
		});

		describe("delete", () => {
			const deleteCases = [
				{
					name: "apiKey is in state",
					state: { apiKey: "sk_test_state" },
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_state",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_SECRET_KEY",
					state: {},
					envSecret: "sk_test_secret",
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_secret",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_API_KEY",
					state: {},
					envSecret: undefined,
					envApi: "sk_test_api",
					mockError: false,
					expectStripeInit: "sk_test_api",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing everywhere (NoOp)",
					state: {},
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: null,
					expectUpdate: false,
				},
				{
					name: "Stripe SDK throws an error (caught safely)",
					state: { apiKey: "sk_test_error" },
					envSecret: undefined,
					envApi: undefined,
					mockError: true,
					expectStripeInit: "sk_test_error",
					expectUpdate: true,
				},
			];

			it.each(deleteCases)(
				"should handle deletion when $name",
				async ({
					state,
					envSecret,
					envApi,
					mockError,
					expectStripeInit,
					expectUpdate,
				}) => {
					const originalSecret = process.env.STRIPE_SECRET_KEY;
					const originalApi = process.env.STRIPE_API_KEY;

					if (envSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = envSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (envApi !== undefined) process.env.STRIPE_API_KEY = envApi;
					else delete process.env.STRIPE_API_KEY;

					if (mockError) {
						mockProductsUpdate.mockRejectedValueOnce(new Error("Stripe error"));
					}

					await provider.delete("prod_123", state as any);

					if (expectStripeInit) {
						expect(MockedStripe).toHaveBeenCalledWith(expectStripeInit);
					}

					if (expectUpdate) {
						expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", {
							active: false,
						});
					} else {
						expect(mockProductsUpdate).not.toHaveBeenCalled();
					}

					if (originalSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = originalSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (originalApi !== undefined)
						process.env.STRIPE_API_KEY = originalApi;
					else delete process.env.STRIPE_API_KEY;
				},
			);
		});
	});

	describe("StripePriceProvider", () => {
		const provider = new StripePriceProvider();

		describe("create", () => {
			const createCases = [
				{
					name: "all properties provided",
					inputs: {
						apiKey: "sk_test_123",
						productId: "prod_123",
						unitAmount: 1000,
						currency: "usd",
						taxBehavior: "inclusive",
					},
					expectedPayload: {
						product: "prod_123",
						unit_amount: 1000,
						currency: "usd",
						tax_behavior: "inclusive",
					},
				},
				{
					name: "required properties provided",
					inputs: {
						apiKey: "sk_test_123",
						productId: "prod_123",
						unitAmount: 1000,
						currency: "usd",
					},
					expectedPayload: {
						product: "prod_123",
						unit_amount: 1000,
						currency: "usd",
						tax_behavior: undefined,
					},
				},
				{
					name: "recurring pricing provided",
					inputs: {
						apiKey: "sk_test_123",
						productId: "prod_123",
						unitAmount: 1000,
						currency: "usd",
						recurring: {
							interval: "month",
							intervalCount: 1,
							usageType: "licensed",
						},
					},
					expectedPayload: {
						product: "prod_123",
						unit_amount: 1000,
						currency: "usd",
						recurring: {
							interval: "month",
							interval_count: 1,
							usage_type: "licensed",
						},
					},
				},
				{
					name: "tiered pricing provided",
					inputs: {
						apiKey: "sk_test_123",
						productId: "prod_123",
						currency: "usd",
						billingScheme: "tiered",
						tiersMode: "volume",
						tiers: [
							{ upTo: 10, unitAmount: 1000 },
							{ upTo: "inf", unitAmount: 800 },
						],
					},
					expectedPayload: {
						product: "prod_123",
						currency: "usd",
						billing_scheme: "tiered",
						tiers_mode: "volume",
						tiers: [
							{ up_to: 10, unit_amount: 1000, flat_amount: undefined },
							{ up_to: "inf", unit_amount: 800, flat_amount: undefined },
						],
					},
				},
				{
					name: "package pricing provided",
					inputs: {
						apiKey: "sk_test_123",
						productId: "prod_123",
						unitAmount: 5000,
						currency: "usd",
						transformQuantity: { divideBy: 5, round: "up" },
					},
					expectedPayload: {
						product: "prod_123",
						unit_amount: 5000,
						currency: "usd",
						transform_quantity: { divide_by: 5, round: "up" },
					},
				},
			];

			it.each(createCases)(
				"should correctly create a price when $name",
				async ({ inputs, expectedPayload }) => {
					const result = await provider.create(inputs as any);

					expect(result.id).toBe("price_123");
					expect(result.outs?.priceId).toBe("price_123");

					expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
					expect(mockPricesCreate).toHaveBeenCalledWith(expectedPayload);
				},
			);
		});

		describe("diff", () => {
			const diffCases = [
				{
					name: "all properties change",
					olds: {
						productId: "prod_1",
						unitAmount: 100,
						currency: "usd",
						taxBehavior: "inclusive",
						apiKey: "old_key",
					},
					news: {
						productId: "prod_2",
						unitAmount: 200,
						currency: "eur",
						taxBehavior: "exclusive",
						apiKey: "new_key",
					},
					expectedChanges: true,
					expectedReplaces: [
						"productId",
						"unitAmount",
						"currency",
						"taxBehavior",
						"apiKey",
					],
				},
				{
					name: "pricing models properties change",
					olds: {
						productId: "prod_1",
						currency: "usd",
						recurring: { interval: "month" },
						billingScheme: "per_unit",
						tiersMode: "volume",
						tiers: [{ upTo: 10 }],
						transformQuantity: { divideBy: 5 },
					},
					news: {
						productId: "prod_1",
						currency: "usd",
						recurring: { interval: "year" },
						billingScheme: "tiered",
						tiersMode: "graduated",
						tiers: [{ upTo: 20 }],
						transformQuantity: { divideBy: 10 },
					},
					expectedChanges: true,
					expectedReplaces: [
						"recurring",
						"billingScheme",
						"tiersMode",
						"tiers",
						"transformQuantity",
					],
				},
				{
					name: "some properties change",
					olds: { productId: "prod_1", unitAmount: 100, currency: "usd" },
					news: { productId: "prod_1", unitAmount: 200, currency: "usd" },
					expectedChanges: true,
					expectedReplaces: ["unitAmount"],
				},
				{
					name: "no properties change",
					olds: { productId: "prod_1", unitAmount: 100, currency: "usd" },
					news: { productId: "prod_1", unitAmount: 100, currency: "usd" },
					expectedChanges: false,
					expectedReplaces: [],
				},
			];

			it.each(diffCases)(
				"should correctly detect diff when $name",
				async ({ olds, news, expectedChanges, expectedReplaces }) => {
					const diffResult = await provider.diff(
						"price_123",
						olds as any,
						news as any,
					);
					expect(diffResult.changes).toBe(expectedChanges);
					expect(diffResult.replaces).toEqual(
						expect.arrayContaining(expectedReplaces),
					);
					expect(diffResult.replaces?.length).toBe(expectedReplaces.length);
				},
			);
		});

		describe("delete", () => {
			const deleteCases = [
				{
					name: "apiKey is in state",
					state: { apiKey: "sk_test_state" },
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_state",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_SECRET_KEY",
					state: {},
					envSecret: "sk_test_secret",
					envApi: undefined,
					mockError: false,
					expectStripeInit: "sk_test_secret",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing, falls back to STRIPE_API_KEY",
					state: {},
					envSecret: undefined,
					envApi: "sk_test_api",
					mockError: false,
					expectStripeInit: "sk_test_api",
					expectUpdate: true,
				},
				{
					name: "apiKey is missing everywhere (NoOp)",
					state: {},
					envSecret: undefined,
					envApi: undefined,
					mockError: false,
					expectStripeInit: null,
					expectUpdate: false,
				},
				{
					name: "Stripe SDK throws an error (caught safely)",
					state: { apiKey: "sk_test_error" },
					envSecret: undefined,
					envApi: undefined,
					mockError: true,
					expectStripeInit: "sk_test_error",
					expectUpdate: true,
				},
			];

			it.each(deleteCases)(
				"should handle deletion when $name",
				async ({
					state,
					envSecret,
					envApi,
					mockError,
					expectStripeInit,
					expectUpdate,
				}) => {
					const originalSecret = process.env.STRIPE_SECRET_KEY;
					const originalApi = process.env.STRIPE_API_KEY;

					if (envSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = envSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (envApi !== undefined) process.env.STRIPE_API_KEY = envApi;
					else delete process.env.STRIPE_API_KEY;

					if (mockError) {
						mockPricesUpdate.mockRejectedValueOnce(new Error("Stripe error"));
					}

					await provider.delete("price_123", state as any);

					if (expectStripeInit) {
						expect(MockedStripe).toHaveBeenCalledWith(expectStripeInit);
					}

					if (expectUpdate) {
						expect(mockPricesUpdate).toHaveBeenCalledWith("price_123", {
							active: false,
						});
					} else {
						expect(mockPricesUpdate).not.toHaveBeenCalled();
					}

					if (originalSecret !== undefined)
						process.env.STRIPE_SECRET_KEY = originalSecret;
					else delete process.env.STRIPE_SECRET_KEY;

					if (originalApi !== undefined)
						process.env.STRIPE_API_KEY = originalApi;
					else delete process.env.STRIPE_API_KEY;
				},
			);
		});
	});
});
