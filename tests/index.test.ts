import { StripePaymentLinkProvider, StripeProductProvider, StripePriceProvider } from "../src/index";
import Stripe from "stripe";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

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

        mockPaymentLinksCreate = vi.fn<any>().mockResolvedValue({ id: "plink_123", url: "https://stripe.com/plink_123" } as any);
        mockPaymentLinksUpdate = vi.fn<any>().mockResolvedValue({ id: "plink_123" } as any);
        
        mockProductsCreate = vi.fn<any>().mockResolvedValue({ id: "prod_123" } as any);
        mockProductsUpdate = vi.fn<any>().mockResolvedValue({ id: "prod_123" } as any);
        
        mockPricesCreate = vi.fn<any>().mockResolvedValue({ id: "price_123" } as any);
        mockPricesUpdate = vi.fn<any>().mockResolvedValue({ id: "price_123" } as any);

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
                        sparksAmount: "100",
                        redirectUrl: "https://example.com/success",
                        allowPromotionCodes: true,
                        managedPayments: true,
                    },
                    expectedPayload: {
                        line_items: [{
                            price: "price_abc",
                            quantity: 1,
                            adjustable_quantity: { enabled: true, minimum: 1, maximum: 100 },
                        }],
                        after_completion: { type: 'redirect', redirect: { url: "https://example.com/success" } },
                        allow_promotion_codes: true,
                        managed_payments: { enabled: true },
                        metadata: { sparks: "100" }
                    }
                },
                {
                    name: "only required properties provided",
                    inputs: {
                        apiKey: "sk_test_123",
                        priceId: "price_abc",
                        sparksAmount: "50",
                        redirectUrl: "https://example.com/success",
                    },
                    expectedPayload: {
                        line_items: [{
                            price: "price_abc",
                            quantity: 1,
                            adjustable_quantity: { enabled: true, minimum: 1, maximum: 100 },
                        }],
                        after_completion: { type: 'redirect', redirect: { url: "https://example.com/success" } },
                        allow_promotion_codes: undefined,
                        metadata: { sparks: "50" }
                    }
                }
            ];

            it.each(createCases)("should correctly map Pulumi inputs to Stripe API payload when $name", async ({ inputs, expectedPayload }) => {
                const result = await provider.create(inputs as any);

                expect(result.id).toBe("plink_123");
                expect(result.outs?.paymentLinkId).toBe("plink_123");
                expect(result.outs?.url).toBe("https://stripe.com/plink_123");
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
                expect(mockPaymentLinksCreate).toHaveBeenCalledWith(expectedPayload);
            });
        });

        describe("diff", () => {
            const diffCases = [
                {
                    name: "all properties change",
                    olds: { priceId: "old", sparksAmount: "10", redirectUrl: "url1", allowPromotionCodes: false, managedPayments: false, apiKey: "old_key" },
                    news: { priceId: "new", sparksAmount: "20", redirectUrl: "url2", allowPromotionCodes: true, managedPayments: true, apiKey: "new_key" },
                    expectedChanges: true,
                    expectedReplaces: ["priceId", "sparksAmount", "redirectUrl", "allowPromotionCodes", "managedPayments", "apiKey"]
                },
                {
                    name: "some properties change",
                    olds: { priceId: "old", sparksAmount: "10", redirectUrl: "url1" },
                    news: { priceId: "old", sparksAmount: "20", redirectUrl: "url1" },
                    expectedChanges: true,
                    expectedReplaces: ["sparksAmount"]
                },
                {
                    name: "no properties change",
                    olds: { priceId: "same", sparksAmount: "10" },
                    news: { priceId: "same", sparksAmount: "10" },
                    expectedChanges: false,
                    expectedReplaces: []
                }
            ];

            it.each(diffCases)("should correctly detect diff when $name", async ({ olds, news, expectedChanges, expectedReplaces }) => {
                const diffResult = await provider.diff("plink_123", olds as any, news as any);
                expect(diffResult.changes).toBe(expectedChanges);
                expect(diffResult.replaces).toEqual(expect.arrayContaining(expectedReplaces));
                expect(diffResult.replaces?.length).toBe(expectedReplaces.length);
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
                }
            ];

            it.each(deleteCases)("should handle deletion when $name", async ({ state, envSecret, envApi, mockError, expectStripeInit, expectUpdate }) => {
                const originalSecret = process.env.STRIPE_SECRET_KEY;
                const originalApi = process.env.STRIPE_API_KEY;
                
                if (envSecret !== undefined) process.env.STRIPE_SECRET_KEY = envSecret;
                else delete process.env.STRIPE_SECRET_KEY;

                if (envApi !== undefined) process.env.STRIPE_API_KEY = envApi;
                else delete process.env.STRIPE_API_KEY;

                if (mockError) {
                    mockPaymentLinksUpdate.mockRejectedValueOnce(new Error("Stripe error"));
                }

                await provider.delete("plink_123", state as any);

                if (expectStripeInit) {
                    expect(MockedStripe).toHaveBeenCalledWith(expectStripeInit);
                }
                
                if (expectUpdate) {
                    expect(mockPaymentLinksUpdate).toHaveBeenCalledWith("plink_123", { active: false });
                } else {
                    expect(mockPaymentLinksUpdate).not.toHaveBeenCalled();
                }

                if (originalSecret !== undefined) process.env.STRIPE_SECRET_KEY = originalSecret;
                else delete process.env.STRIPE_SECRET_KEY;
                
                if (originalApi !== undefined) process.env.STRIPE_API_KEY = originalApi;
                else delete process.env.STRIPE_API_KEY;
            });
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
                    }
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
                    }
                }
            ];

            it.each(createCases)("should correctly create a product when $name", async ({ inputs, expectedPayload }) => {
                const result = await provider.create(inputs as any);

                expect(result.id).toBe("prod_123");
                expect(result.outs?.productId).toBe("prod_123");
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
                expect(mockProductsCreate).toHaveBeenCalledWith(expectedPayload);
            });
        });

        describe("diff", () => {
            const diffCases = [
                {
                    name: "all properties change",
                    olds: { name: "old name", description: "old desc", taxCode: "tx_1", apiKey: "old_key" },
                    news: { name: "new name", description: "new desc", taxCode: "tx_2", apiKey: "new_key" },
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
                }
            ];

            it.each(diffCases)("should correctly detect diff when $name", async ({ olds, news, expectedChanges }) => {
                const diffResult = await provider.diff("prod_123", olds as any, news as any);
                expect(diffResult.changes).toBe(expectedChanges);
                expect(diffResult.replaces).toHaveLength(0);
            });
        });

        describe("update", () => {
            it("should correctly update a product", async () => {
                const result = await provider.update("prod_123", 
                    { apiKey: "sk_test_123", name: "Old Name" } as any,
                    { apiKey: "sk_test_123", name: "New Name", description: "New Desc", taxCode: "txcd_999" } as any
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
                }
            ];

            it.each(deleteCases)("should handle deletion when $name", async ({ state, envSecret, envApi, mockError, expectStripeInit, expectUpdate }) => {
                const originalSecret = process.env.STRIPE_SECRET_KEY;
                const originalApi = process.env.STRIPE_API_KEY;
                
                if (envSecret !== undefined) process.env.STRIPE_SECRET_KEY = envSecret;
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
                    expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", { active: false });
                } else {
                    expect(mockProductsUpdate).not.toHaveBeenCalled();
                }

                if (originalSecret !== undefined) process.env.STRIPE_SECRET_KEY = originalSecret;
                else delete process.env.STRIPE_SECRET_KEY;
                
                if (originalApi !== undefined) process.env.STRIPE_API_KEY = originalApi;
                else delete process.env.STRIPE_API_KEY;
            });
        });
    });

    describe("StripePriceProvider", () => {
        const provider = new StripePriceProvider();

        describe("create", () => {
            const createCases = [
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
                    }
                }
            ];

            it.each(createCases)("should correctly create a price when $name", async ({ inputs, expectedPayload }) => {
                const result = await provider.create(inputs as any);

                expect(result.id).toBe("price_123");
                expect(result.outs?.priceId).toBe("price_123");
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey);
                expect(mockPricesCreate).toHaveBeenCalledWith(expectedPayload);
            });
        });

        describe("diff", () => {
            const diffCases = [
                {
                    name: "all properties change",
                    olds: { productId: "prod_1", unitAmount: 100, currency: "usd", apiKey: "old_key" },
                    news: { productId: "prod_2", unitAmount: 200, currency: "eur", apiKey: "new_key" },
                    expectedChanges: true,
                    expectedReplaces: ["productId", "unitAmount", "currency", "apiKey"]
                },
                {
                    name: "some properties change",
                    olds: { productId: "prod_1", unitAmount: 100, currency: "usd" },
                    news: { productId: "prod_1", unitAmount: 200, currency: "usd" },
                    expectedChanges: true,
                    expectedReplaces: ["unitAmount"]
                },
                {
                    name: "no properties change",
                    olds: { productId: "prod_1", unitAmount: 100, currency: "usd" },
                    news: { productId: "prod_1", unitAmount: 100, currency: "usd" },
                    expectedChanges: false,
                    expectedReplaces: []
                }
            ];

            it.each(diffCases)("should correctly detect diff when $name", async ({ olds, news, expectedChanges, expectedReplaces }) => {
                const diffResult = await provider.diff("price_123", olds as any, news as any);
                expect(diffResult.changes).toBe(expectedChanges);
                expect(diffResult.replaces).toEqual(expect.arrayContaining(expectedReplaces));
                expect(diffResult.replaces?.length).toBe(expectedReplaces.length);
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
                }
            ];

            it.each(deleteCases)("should handle deletion when $name", async ({ state, envSecret, envApi, mockError, expectStripeInit, expectUpdate }) => {
                const originalSecret = process.env.STRIPE_SECRET_KEY;
                const originalApi = process.env.STRIPE_API_KEY;
                
                if (envSecret !== undefined) process.env.STRIPE_SECRET_KEY = envSecret;
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
                    expect(mockPricesUpdate).toHaveBeenCalledWith("price_123", { active: false });
                } else {
                    expect(mockPricesUpdate).not.toHaveBeenCalled();
                }

                if (originalSecret !== undefined) process.env.STRIPE_SECRET_KEY = originalSecret;
                else delete process.env.STRIPE_SECRET_KEY;
                
                if (originalApi !== undefined) process.env.STRIPE_API_KEY = originalApi;
                else delete process.env.STRIPE_API_KEY;
            });
        });
    });
});
