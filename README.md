# pulumi-dynamic-stripe
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe?ref=badge_shield)


A native Pulumi Dynamic Provider for Stripe.

## Why this package?

The official `pulumi-stripe` package is a bridged Terraform provider that relies on an older version of the Stripe API. It lacks support for modern features, including Stripe Payment Links.

`pulumi-dynamic-stripe` solves this by natively wrapping the official Node.js `stripe` SDK using Pulumi's Dynamic Providers. Because it directly interfaces with the SDK, it can support any modern Stripe endpoint natively in TypeScript.

## Installation

```bash
npm install pulumi-dynamic-stripe
```

## Usage: Payment Links

```typescript
import * as pulumi from "@pulumi/pulumi";
import { PaymentLink } from "pulumi-dynamic-stripe";

const config = new pulumi.Config();
const stripeApiKey = config.requireSecret("stripeApiKey");

// Requires an existing Price ID
const sparksPaymentLink = new PaymentLink("sparks-link", {
    apiKey: stripeApiKey,
    priceId: "price_123456789",
    sparksAmount: "1000",
});

export const paymentUrl = sparksPaymentLink.url;
```

## How it works

Behind the scenes, this library defines a custom Pulumi Dynamic Resource Provider that implements the CRUD operations for Stripe Payment Links via the `@pulumi/pulumi` and `stripe` Node packages.


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fefaj%2Fpulumi-dynamic-stripe?ref=badge_large)