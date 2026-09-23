"use client";

import { Tabs } from "@/components/ui/tabs";
import { EligibilityQuestionList } from "./EligibilityQuestionList";
import { EligibilityRuleSetList } from "./EligibilityRuleSetList";

export function EligibilitySettingsTabs({
  canCreateQuestion,
  canCreateRuleSet,
  canPublishRuleSet,
  canReadQuestions,
  canReadRuleSets,
  canUpdateQuestion,
  canUpdateRuleSet,
}: {
  canCreateQuestion: boolean;
  canCreateRuleSet: boolean;
  canPublishRuleSet: boolean;
  canReadQuestions: boolean;
  canReadRuleSets: boolean;
  canUpdateQuestion: boolean;
  canUpdateRuleSet: boolean;
}) {
  const items = [
    ...(canReadRuleSets ? [{
      content: (
        <EligibilityRuleSetList
          canCreate={canCreateRuleSet}
          canPublish={canPublishRuleSet}
          canUpdate={canUpdateRuleSet}
        />
      ),
      id: "rulesets" as const,
      label: "Rulesets",
    }] : []),
    ...(canReadQuestions ? [{
      content: (
        <EligibilityQuestionList
          canCreate={canCreateQuestion}
          canUpdate={canUpdateQuestion}
        />
      ),
      id: "questions" as const,
      label: "Questions",
    }] : []),
  ];
  return (
    <Tabs
      ariaLabel="Eligibility configuration"
      defaultSelectedId={items[0]!.id}
      items={items}
    />
  );
}
