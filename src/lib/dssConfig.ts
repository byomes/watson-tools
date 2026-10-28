// Single place for the names and labels that belong to one church. Set NEXT_PUBLIC_DSS_NAME (and friends) in the environment
// to rebrand the DSS; the defaults below are Catalyst's, so nothing changes until a value is set.
export const DSS_CHURCH = process.env.NEXT_PUBLIC_DSS_CHURCH ?? 'Catalyst'
export const DSS_NAME = process.env.NEXT_PUBLIC_DSS_NAME ?? `${DSS_CHURCH} DSS`
