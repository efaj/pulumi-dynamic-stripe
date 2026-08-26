"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentLink = void 0;
const pulumi = __importStar(require("@pulumi/pulumi"));
// @ts-ignore
const stripe_1 = __importDefault(require("stripe"));
class StripePaymentLinkProvider {
    async create(inputs) {
        const stripe = new stripe_1.default(inputs.apiKey, { apiVersion: '2022-11-15' }); // Using older API version to avoid typings mismatch if any
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [{
                    price: inputs.priceId,
                    quantity: 1,
                }],
            metadata: {
                sparks: inputs.sparksAmount
            }
        });
        return {
            id: paymentLink.id,
            outs: {
                ...inputs,
                paymentLinkId: paymentLink.id,
                url: paymentLink.url,
            }
        };
    }
    async delete(id, props) {
        const stripe = new stripe_1.default(props.apiKey, { apiVersion: '2022-11-15' });
        // Payment links cannot be deleted, but they can be deactivated
        await stripe.paymentLinks.update(id, { active: false });
    }
}
class PaymentLink extends pulumi.dynamic.Resource {
    url;
    paymentLinkId;
    constructor(name, args, opts) {
        super(new StripePaymentLinkProvider(), name, args, opts);
    }
}
exports.PaymentLink = PaymentLink;
