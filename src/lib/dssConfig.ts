// Single place for the names and labels that belong to one church. Set NEXT_PUBLIC_DSS_NAME (and friends) in the environment
// to rebrand the DSS; the church defaults below are Catalyst's; the product name is 9e9 Digital Shepherding, so nothing changes until a value is set.
export const DSS_CHURCH = process.env.NEXT_PUBLIC_DSS_CHURCH ?? 'Catalyst'
export const DSS_NAME = process.env.NEXT_PUBLIC_DSS_NAME ?? '9e9 Digital Shepherding'
export const DSS_TAGLINE = process.env.NEXT_PUBLIC_DSS_TAGLINE ?? 'Know Every One.'
