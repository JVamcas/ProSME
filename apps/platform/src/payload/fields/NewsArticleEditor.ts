import { BlocksFeature, FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";

import { newsArticleBlocks } from "../blocks/NewsArticleBlocks";

export const newsArticleEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    FixedToolbarFeature(),
    BlocksFeature({ blocks: newsArticleBlocks }),
  ],
});
