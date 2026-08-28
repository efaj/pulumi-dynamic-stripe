import Stripe from "stripe";

/**
 * Safely deactivates a Stripe resource during Pulumi deletion.
 * Falls back to environment variables if the apiKey is missing from state.
 * Prevents Pulumi state engine crashes when a resource cannot be deactivated.
 */
export async function safeDeactivateStripeResource(
    providerName: string,
    resourceId: string,
    apiKeyFromState: string | undefined,
    deactivateFn: (stripe: Stripe) => Promise<void>
): Promise<void> {
    const apiKey = apiKeyFromState || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
    if (!apiKey) {
        console.warn(`[${providerName}] Skipping deletion of ${resourceId} due to missing apiKey in state and environment variables.`);
        return;
    }
    
    try {
        const stripe = new Stripe(apiKey);
        await deactivateFn(stripe);
    } catch (error) {
        console.warn(`[${providerName}] Failed to deactivate ${resourceId}:`, error);
    }
}
