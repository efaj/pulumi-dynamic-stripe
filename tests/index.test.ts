import { StripePaymentLinkProvider, StripeProductProvider, StripePriceProvider } from "../src/index";
import Stripe from "stripe";
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Stripe SDK
jest.mock("stripe");

const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe("Stripe Providers", () => {
    let mockPaymentLinksCreate: jest.Mock<any>;
    let mockPaymentLinksUpdate: jest.Mock<any>;
    let mockProductsCreate: jest.Mock<any>;
    let mockProductsUpdate: jest.Mock<any>;
    let mockPricesCreate: jest.Mock<any>;
    let mockPricesUpdate: jest.Mock<any>;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        mockPaymentLinksCreate = jest.fn<any>().mockResolvedValue({ id: "plink_123", url: "https://stripe.com/plink_123" } as any);
        mockPaymentLinksUpdate = jest.fn<any>().mockResolvedValue({ id: "plink_123" } as any);
        
        mockProductsCreate = jest.fn<any>().mockResolvedValue({ id: "prod_123" } as any);
        mockProductsUpdate = jest.fn<any>().mockResolvedValue({ id: "prod_123" } as any);
        
        mockPricesCreate = jest.fn<any>().mockResolvedValue({ id: "price_123" } as any);
        mockPricesUpdate = jest.fn<any>().mockResolvedValue({ id: "price_123" } as any);

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
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey, { apiVersion: '2022-11-15' as any });
                expect(mockPaymentLinksCreate).toHaveBeenCalledWith(expectedPayload);
            });
        });

        describe("delete", () => {
            it("should deactivate the payment link", async () => {
                await provider.delete("plink_123", { apiKey: "sk_test_123" } as any);
                expect(mockPaymentLinksUpdate).toHaveBeenCalledWith("plink_123", { active: false });
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
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey, { apiVersion: '2022-11-15' as any });
                expect(mockProductsCreate).toHaveBeenCalledWith(expectedPayload);
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
            it("should deactivate the product on delete", async () => {
                await provider.delete("prod_123", { apiKey: "sk_test_123" } as any);
                expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", { active: false });
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
                
                expect(MockedStripe).toHaveBeenCalledWith(inputs.apiKey, { apiVersion: '2022-11-15' as any });
                expect(mockPricesCreate).toHaveBeenCalledWith(expectedPayload);
            });
        });

        describe("delete", () => {
            it("should deactivate the price on delete", async () => {
                await provider.delete("price_123", { apiKey: "sk_test_123" } as any);
                expect(mockPricesUpdate).toHaveBeenCalledWith("price_123", { active: false });
            });
        });
    });
});
