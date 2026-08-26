# pulumi-dynamic-stripe

![NPM Version](https://img.shields.io/npm/v/pulumi-dynamic-stripe)
![License](https://img.shields.io/npm/l/pulumi-dynamic-stripe)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe?ref=badge_shield)

A native Pulumi Dynamic Provider for Stripe.

## Why this package?

The official `pulumi-stripe` package is a bridged Terraform provider that relies on an older version of the Stripe API. It lacks support for modern features, including Stripe Payment Links.

`pulumi-dynamic-stripe` solves this by natively wrapping the official Node.js `stripe` SDK using Pulumi's Dynamic Providers. Because it directly interfaces with the SDK, it can support any modern Stripe endpoint natively in TypeScript.

## Features

This package provides native Pulumi resources for the following Stripe objects:
*   **[Product](file:///media/efaj/data/workspace/pulumi-dynamic-stripe/src/index.ts#L57):** Represents a product you sell in Stripe.
*   **[Price](file:///media/efaj/data/workspace/pulumi-dynamic-stripe/src/index.ts#L106):** Represents a price attached to a Product.
*   **[PaymentLink](file:///media/efaj/data/workspace/pulumi-dynamic-stripe/src/index.ts#L48):** Represents a shareable URL that allows customers to purchase a Price.

## Known Gaps

Currently, this library is focused on the core billing and checkout flow and only implements the three resources listed above (`Product`, `Price`, `PaymentLink`). Other Stripe objects (like `Customer`, `Subscription`, `Invoice`, etc.) are not yet supported. 

Contributions to add more dynamic providers for other Stripe resources are highly welcome!

## Installation

```bash
npm install pulumi-dynamic-stripe
```

## Usage

Here is a full example of provisioning a Product, attaching a Price to it, and generating a Payment Link for it—all managed as Pulumi infrastructure.

```typescript
import * as pulumi from "@pulumi/pulumi";
import { Product, Price, PaymentLink } from "pulumi-dynamic-stripe";

const config = new pulumi.Config();
const stripeApiKey = config.requireSecret("stripeApiKey");

// 1. Create a Product
const premiumProduct = new Product("premium-product", {
    apiKey: stripeApiKey,
    name: "Premium Subscription",
    description: "Access to all premium features",
});

// 2. Create a Price for the Product
const premiumPrice = new Price("premium-price", {
    apiKey: stripeApiKey,
    productId: premiumProduct.productId,
    unitAmount: 2000, // $20.00
    currency: "usd",
});

// 3. Generate a Payment Link for the Price
const premiumPaymentLink = new PaymentLink("premium-link", {
    apiKey: stripeApiKey,
    priceId: premiumPrice.priceId,
    sparksAmount: "1000",
});

// Export the generated URL so it can be used in your application
export const paymentUrl = premiumPaymentLink.url;
```

## How it works

Behind the scenes, this library defines custom Pulumi Dynamic Resource Providers that implement the CRUD operations for Stripe entities via the `@pulumi/pulumi` and `stripe` Node packages.
