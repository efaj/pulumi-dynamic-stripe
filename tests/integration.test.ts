import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { describe, expect, it } from "vitest";
import { Product } from "../dist/index";

describe("Pulumi Dynamic Provider Serialization", () => {
	it("should successfully serialize the provider closure without crashing", async () => {
		// Define an inline Pulumi program that instantiates one of our dynamic resources
		const program = async () => {
			const product = new Product("test-product", {
				apiKey: "sk_test_123",
				name: "Test Serialization Product",
			});
			return {
				productId: product.productId,
			};
		};

		// Create a temporary stack using the inline program
		const stack = await LocalWorkspace.createOrSelectStack(
			{
				stackName: "test-stack",
				projectName: "pulumi-dynamic-stripe-test",
				program,
			},
			{
				envVars: {
					PULUMI_CONFIG_PASSPHRASE: "test", // Required for local backends in non-interactive CI
				},
				workDir: process.cwd(),
				projectSettings: {
					name: "pulumi-dynamic-stripe-test",
					runtime: "nodejs",
					backend: { url: "file://~" }, // Use local state
				},
			},
		);

		// Run a preview
		// During preview, the dynamic provider closure is serialized and sent to the Pulumi engine.
		// If there is a serialization issue (e.g. TypeScript 7 AST parsing failure),
		// this preview will throw a runtime error.
		try {
			const preview = await stack.preview();
			expect(preview.stdout).toBeDefined();
		} finally {
			// Clean up the temporary stack
			await stack.workspace.removeStack("test-stack");
		}
	}, 30000); // 30 second timeout since Pulumi engine startup can take a few seconds
});
