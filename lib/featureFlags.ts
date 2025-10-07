const siteRegion = process.env.NEXT_PUBLIC_SITE_REGION || 'global'

const enableAiImagesEnv = process.env.NEXT_PUBLIC_ENABLE_AI_IMAGES
const isChinaSite = siteRegion.toLowerCase() === 'china'

const enableAiImages =
  enableAiImagesEnv !== undefined
    ? enableAiImagesEnv === 'true'
    : !isChinaSite

export const featureFlags = {
  siteRegion,
  isChinaSite,
  enableAiImages,
}

