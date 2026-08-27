# Troubleshooting Stuck State in Pulumi Dynamic Providers

## The Problem

When using `pulumi-dynamic-stripe` versions **0.0.1** and **0.0.2**, you might encounter an issue where Pulumi fails to delete a Stripe resource (e.g., a Payment Link) during a `pulumi up`, `pulumi destroy`, or replacement operation.

The stack will show the resource as `deleting failed` with an error similar to this:

```
Error: Neither apiKey nor config.authenticator provided
    at Stripe._setAuthenticator (node_modules/stripe/src/stripe.core.ts:1319:13)
```

## Why This Happens

This is fundamentally caused by how Pulumi Dynamic Providers function under the hood. 

When you deploy a resource using a Dynamic Provider, Pulumi takes the **JavaScript source code of your provider methods** (like `create`, `update`, `diff`, and importantly `delete`) and **serializes the compiled code directly into the Pulumi state file in the cloud**.

In versions `0.0.1` and `0.0.2` of this library, the `delete` method had a bug where it crashed if it couldn't find an API key in the Pulumi state (due to how state diffs and replacement work). Although we patched this bug in the library's source code by adding environment variable fallbacks and `try/catch` handlers, **Pulumi does not use your newly updated local code to delete older resources.**

Instead, Pulumi downloads the *old, buggy, serialized `delete` function* that was saved in the cloud during the resource's initial creation, and attempts to run it. When that old code inevitably crashes, the resource gets stuck in a perpetual `deleting failed` state.

## The Solution

Since you cannot fix an old resource's deletion behavior by updating your local provider package, you must manually excise the corrupted resource from the Pulumi state.

### Step 1: Export the Pulumi State
First, export your stack's state to a local JSON file:
```bash
pulumi stack export > state.json
```

### Step 2: Identify and Remove the Corrupted Resource
Open `state.json` in a text editor and search for the resource that is stuck. You are looking for a JSON object in the `deployment.resources` array that matches your resource's URN and has `"delete": true` set.

For example, look for something like this and **delete the entire JSON object from the array**:
```json
{
    "urn": "urn:pulumi:prod.quiz.crenet-games::quizai-infrastructure::pulumi-nodejs:dynamic:Resource::sparks-link",
    "custom": true,
    "delete": true,
    "id": "plink_1U8pkf1i5elBtkZIXxmnduNm",
    "type": "pulumi-nodejs:dynamic:Resource",
    "inputs": { ... }
}
```

*Alternatively, you can script this step using Node or `jq`.*

### Step 3: Import the Fixed State
Once the offending resource object is removed from the JSON array, save the file and import it back to Pulumi:
```bash
pulumi stack import --file state.json
```

### Step 4: Re-run Pulumi Up
Now that the stuck state is gone, Pulumi will no longer attempt to run the broken deletion hook. Run your update command:
```bash
pulumi up -y
```

Moving forward, any new resources created by the updated provider will have the new, robust, crash-free `delete` function serialized into the state, permanently solving this issue.
