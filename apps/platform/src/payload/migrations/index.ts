import * as migration_20260911_180817_phase1_payload_foundation from './20260911_180817_phase1_payload_foundation';
import * as migration_20260911_200942_phase2_public_content from './20260911_200942_phase2_public_content';
import * as migration_20260911_202515_phase2_global_publishing from './20260911_202515_phase2_global_publishing';
import * as migration_20260912_083720_phase2_content_delivery_completion from './20260912_083720_phase2_content_delivery_completion';
import * as migration_20260912_091053_phase2_homepage_blocks from './20260912_091053_phase2_homepage_blocks';
import * as migration_20260912_114731_phase2_funding_page_sections from './20260912_114731_phase2_funding_page_sections';
import * as migration_20260912_121549_phase2_eligibility_focus_section from './20260912_121549_phase2_eligibility_focus_section';
import * as migration_20260912_124200_phase2_impact_summary from './20260912_124200_phase2_impact_summary';
import * as migration_20260912_124500_phase2_page_impact_summary from './20260912_124500_phase2_page_impact_summary';
import * as migration_20260912_130000_phase2_impact_background from './20260912_130000_phase2_impact_background';

export const migrations = [
  {
    up: migration_20260911_180817_phase1_payload_foundation.up,
    down: migration_20260911_180817_phase1_payload_foundation.down,
    name: '20260911_180817_phase1_payload_foundation',
  },
  {
    up: migration_20260911_200942_phase2_public_content.up,
    down: migration_20260911_200942_phase2_public_content.down,
    name: '20260911_200942_phase2_public_content',
  },
  {
    up: migration_20260911_202515_phase2_global_publishing.up,
    down: migration_20260911_202515_phase2_global_publishing.down,
    name: '20260911_202515_phase2_global_publishing',
  },
  {
    up: migration_20260912_083720_phase2_content_delivery_completion.up,
    down: migration_20260912_083720_phase2_content_delivery_completion.down,
    name: '20260912_083720_phase2_content_delivery_completion',
  },
  {
    up: migration_20260912_091053_phase2_homepage_blocks.up,
    down: migration_20260912_091053_phase2_homepage_blocks.down,
    name: '20260912_091053_phase2_homepage_blocks',
  },
  {
    up: migration_20260912_114731_phase2_funding_page_sections.up,
    down: migration_20260912_114731_phase2_funding_page_sections.down,
    name: '20260912_114731_phase2_funding_page_sections',
  },
  {
    up: migration_20260912_121549_phase2_eligibility_focus_section.up,
    down: migration_20260912_121549_phase2_eligibility_focus_section.down,
    name: '20260912_121549_phase2_eligibility_focus_section',
  },
  {
    up: migration_20260912_124200_phase2_impact_summary.up,
    down: migration_20260912_124200_phase2_impact_summary.down,
    name: '20260912_124200_phase2_impact_summary',
  },
  {
    up: migration_20260912_124500_phase2_page_impact_summary.up,
    down: migration_20260912_124500_phase2_page_impact_summary.down,
    name: '20260912_124500_phase2_page_impact_summary',
  },
  {
    up: migration_20260912_130000_phase2_impact_background.up,
    down: migration_20260912_130000_phase2_impact_background.down,
    name: '20260912_130000_phase2_impact_background'
  },
];
