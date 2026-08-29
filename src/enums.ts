export enum TaxBehavior {
    Inclusive = "inclusive",
    Exclusive = "exclusive",
    Unspecified = "unspecified",
}

export enum BillingScheme {
    PerUnit = "per_unit",
    Tiered = "tiered",
}

export enum TiersMode {
    Graduated = "graduated",
    Volume = "volume",
}

export enum RecurringInterval {
    Day = "day",
    Week = "week",
    Month = "month",
    Year = "year",
}

export enum UsageType {
    Metered = "metered",
    Licensed = "licensed",
}
