import { StripePaymentLinkProvider, StripeProductProvider, StripePriceProvider } from "../src/index";
import Stripe from "stripe";
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the Stripe SDK
jest.mock("stripe");

const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe("Stripe Providers", () => {
    let mockPaymentLinksCreate: jest.Mock;
    let mockPaymentLinksUpdate: jest.Mock;
    let mockProductsCreate: jest.Mock;
    let mockProductsUpdate: jest.Mock;
    let mockPricesCreate: jest.Mock;
    let mockPricesUpdate: jest.Mock;

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
        it("should correctly map Pulumi inputs to Stripe API payload on create", async () => {
            const provider = new StripePaymentLinkProvider();
            
            const result = await provider.create({
                apiKey: "sk_test_123",
                priceId: "price_abc",
                sparksAmount: "100",
                redirectUrl: "https://example.com/success",
                allowPromotionCodes: true,
            });

            expect(result.id).toBe("plink_123");
            expect(result.outs?.paymentLinkId).toBe("plink_123");
            expect(result.outs?.url).toBe("https://stripe.com/plink_123");
            
            expect(MockedStripe).toHaveBeenCalledWith("sk_test_123", { apiVersion: '2022-11-15' as any });
            expect(mockPaymentLinksCreate).toHaveBeenCalledWith({
                line_items: [{
                    price: "price_abc",
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
                        url: "https://example.com/success",
                    }
                },
                allow_promotion_codes: true,
                metadata: {
                    sparks: "100"
                }
            });
        });

        it("should deactivate the payment link on delete", async () => {
            const provider = new StripePaymentLinkProvider();
            
            await provider.delete("plink_123", {
                apiKey: "sk_test_123",
                priceId: "price_abc",
                sparksAmount: "100",
                redirectUrl: "https://example.com/success",
            });

            expect(mockPaymentLinksUpdate).toHaveBeenCalledWith("plink_123", { active: false });
        });
    });

    describe("StripeProductProvider", () => {
        it("should correctly create a product", async () => {
            const provider = new StripeProductProvider();
            
            const result = await provider.create({
                apiKey: "sk_test_123",
                name: "Test Product",
                description: "Test Description",
            });

            expect(result.id).toBe("prod_123");
            expect(result.outs?.productId).toBe("prod_123");
            
            expect(mockProductsCreate).toHaveBeenCalledWith({
                name: "Test Product",
                description: "Test Description",
            });
        });

        it("should correctly update a product", async () => {
            const provider = new StripeProductProvider();
            
            const result = await provider.update("prod_123", 
                { apiKey: "sk_test_123", name: "Old Name" },
                { apiKey: "sk_test_123", name: "New Name", description: "New Desc" }
            );

            expect(result.outs?.productId).toBe("prod_123");
            expect(result.outs?.name).toBe("New Name");
            
            expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", {
                name: "New Name",
                description: "New Desc",
            });
        });

        it("should deactivate the product on delete", async () => {
            const provider = new StripeProductProvider();
            
            await provider.delete("prod_123", {
                apiKey: "sk_test_123",
                name: "Test Product",
            });

            expect(mockProductsUpdate).toHaveBeenCalledWith("prod_123", { active: false });
        });
    });

    describe("StripePriceProvider", () => {
        it("should correctly create a price", async () => {
            const provider = new StripePriceProvider();
            
            const result = await provider.create({
                apiKey: "sk_test_123",
                productId: "prod_123",
                unitAmount: 1000,
                currency: "usd",
            });

            expect(result.id).toBe("price_123");
            expect(result.outs?.priceId).toBe("price_123");
            
            expect(mockPricesCreate).toHaveBeenCalledWith({
                product: "prod_123",
                unit_amount: 1000,
                currency: "usd",
            });
        });

        it("should deactivate the price on delete", async () => {
            const provider = new StripePriceProvider();
            
            await provider.delete("price_123", {
                apiKey: "sk_test_123",
                productId: "prod_123",
                unitAmount: 1000,
                currency: "usd",
            });

            expect(mockPricesUpdate).toHaveBeenCalledWith("price_123", { active: false });
        });
    });
});
