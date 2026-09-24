WITH canonical_permission(code) AS (
  VALUES
    ('user.read'),
    ('user.manage'),
    ('user.profile.own.read'),
    ('user.profile.own.update'),
    ('business.own.read'),
    ('business.own.update'),
    ('funding.call.read'),
    ('funding.call.create'),
    ('funding.call.update'),
    ('funding.call.submit.all'),
    ('funding.call.approve.all'),
    ('funding.call.return.all'),
    ('funding.call.approval-request.own.withdraw'),
    ('funding.call.publish'),
    ('funding.call.delete'),
    ('funding.call.eligibility.create'),
    ('funding.call.eligibility.own.read'),
    ('eligibility.ruleset.read'),
    ('eligibility.ruleset.create'),
    ('eligibility.ruleset.update'),
    ('eligibility.ruleset.publish'),
    ('eligibility.ruleset.retire'),
    ('funding.application.create'),
    ('funding.application.own.read'),
    ('funding.application.own.update'),
    ('funding.application.submit'),
    ('funding.application.all.read'),
    ('funding.application.bulk-update'),
    ('funding.application.export'),
    ('funding.application.document.own.read'),
    ('funding.application.document.own.upload'),
    ('funding.application.information-request.create'),
    ('funding.application.information-request.own.read'),
    ('funding.application.information-request.own.respond'),
    ('workflow.task.assigned.read'),
    ('workflow.task.assigned.process'),
    ('workflow.task.assigned.decide'),
    ('workflow.task.claim'),
    ('workflow.task.assign'),
    ('workflow.task.cancel.all'),
    ('workflow.task.reassign'),
    ('workflow.task.delegate'),
    ('workflow.task.all.read'),
    ('workflow.task.pool.read'),
    ('workflow.definition.read'),
    ('workflow.definition.create'),
    ('workflow.definition.update'),
    ('workflow.definition.submit.all'),
    ('workflow.definition.return.all'),
    ('workflow.definition.approve.all'),
    ('workflow.definition.publish'),
    ('workflow.definition.retire'),
    ('workflow.form.read'),
    ('workflow.form.create'),
    ('workflow.form.update'),
    ('workflow.form.publish'),
    ('workflow.form.retire'),
    ('role.read'),
    ('role.manage'),
    ('audit.read'),
    ('user.notification.own.read'),
    ('cms.access'),
    ('cms.principals.manage'),
    ('cms.audit.read'),
    ('integration.erp.enqueue')
), cms_permission(code) AS (
  SELECT format('cms.%s.%s', resource, action)
  FROM unnest(ARRAY[
    'pages',
    'news',
    'resources',
    'events',
    'faqs',
    'eligibility',
    'statistics',
    'media',
    'site-settings',
    'engagement-submissions'
  ]) AS resource
  CROSS JOIN unnest(ARRAY['read', 'create', 'update', 'publish', 'delete']) AS action
), all_permission(code) AS (
  SELECT code FROM canonical_permission
  UNION ALL
  SELECT code FROM cms_permission
)
INSERT INTO app_capabilities (code, description)
SELECT code, 'Canonical permission: ' || code
FROM all_permission
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
WITH permission_mapping(old_code, new_code) AS (
  VALUES
    ('profile.read.own', 'user.profile.own.read'),
    ('profile.update.own', 'user.profile.own.update'),
    ('business.read.own', 'business.own.read'),
    ('business.update.own', 'business.own.update'),
    ('eligibility.create', 'funding.call.eligibility.create'),
    ('eligibility.read.own', 'funding.call.eligibility.own.read'),
    ('application.create', 'funding.application.create'),
    ('application.read.own', 'funding.application.own.read'),
    ('application.update.own', 'funding.application.own.update'),
    ('application.submit', 'funding.application.submit'),
    ('application.read.all', 'funding.application.all.read'),
    ('application.read.assigned', 'workflow.task.assigned.read'),
    ('application.bulk_update', 'funding.application.bulk-update'),
    ('application.export', 'funding.application.export'),
    ('application.request_information', 'funding.application.information-request.create'),
    ('document.read.own', 'funding.application.document.own.read'),
    ('document.upload.own', 'funding.application.document.own.upload'),
    ('information_request.read.own', 'funding.application.information-request.own.read'),
    ('information_request.respond.own', 'funding.application.information-request.own.respond'),
    ('notification.read.own', 'user.notification.own.read'),
    ('work_queue.read', 'workflow.task.pool.read'),
    ('workflow.task.read', 'workflow.task.assigned.read'),
    ('workflow.task.complete', 'workflow.task.assigned.process'),
    ('application.screen', 'workflow.task.assigned.process'),
    ('form.read', 'workflow.form.read'),
    ('form.create', 'workflow.form.create'),
    ('form.update', 'workflow.form.update'),
    ('form.publish', 'workflow.form.publish'),
    ('form.retire', 'workflow.form.retire')
)
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT legacy_grant.role_id, canonical_capability.id
FROM permission_mapping
JOIN app_capabilities legacy_capability
  ON legacy_capability.code = permission_mapping.old_code
JOIN app_role_capabilities legacy_grant
  ON legacy_grant.capability_id = legacy_capability.id
JOIN app_capabilities canonical_capability
  ON canonical_capability.code = permission_mapping.new_code
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
WITH canonical_permission(code) AS (
  VALUES
    ('user.read'), ('user.manage'), ('user.profile.own.read'),
    ('user.profile.own.update'), ('business.own.read'),
    ('business.own.update'), ('funding.call.read'),
    ('funding.call.create'), ('funding.call.update'),
    ('funding.call.submit.all'), ('funding.call.approve.all'),
    ('funding.call.return.all'),
    ('funding.call.approval-request.own.withdraw'),
    ('funding.call.publish'), ('funding.call.delete'),
    ('funding.call.eligibility.create'),
    ('funding.call.eligibility.own.read'),
    ('eligibility.ruleset.read'), ('eligibility.ruleset.create'),
    ('eligibility.ruleset.update'), ('eligibility.ruleset.publish'),
    ('eligibility.ruleset.retire'), ('funding.application.create'),
    ('funding.application.own.read'), ('funding.application.own.update'),
    ('funding.application.submit'), ('funding.application.all.read'),
    ('funding.application.bulk-update'), ('funding.application.export'),
    ('funding.application.document.own.read'),
    ('funding.application.document.own.upload'),
    ('funding.application.information-request.create'),
    ('funding.application.information-request.own.read'),
    ('funding.application.information-request.own.respond'),
    ('workflow.task.assigned.read'), ('workflow.task.assigned.process'),
    ('workflow.task.assigned.decide'), ('workflow.task.claim'),
    ('workflow.task.assign'), ('workflow.task.cancel.all'),
    ('workflow.task.reassign'), ('workflow.task.delegate'),
    ('workflow.task.all.read'), ('workflow.task.pool.read'),
    ('workflow.definition.read'), ('workflow.definition.create'),
    ('workflow.definition.update'), ('workflow.definition.submit.all'),
    ('workflow.definition.return.all'), ('workflow.definition.approve.all'),
    ('workflow.definition.publish'), ('workflow.definition.retire'),
    ('workflow.form.read'), ('workflow.form.create'),
    ('workflow.form.update'), ('workflow.form.publish'),
    ('workflow.form.retire'), ('role.read'), ('role.manage'),
    ('audit.read'), ('user.notification.own.read'), ('cms.access'),
    ('cms.principals.manage'), ('cms.audit.read'),
    ('integration.erp.enqueue')
), cms_permission(code) AS (
  SELECT format('cms.%s.%s', resource, action)
  FROM unnest(ARRAY[
    'pages', 'news', 'resources', 'events', 'faqs', 'eligibility',
    'statistics', 'media', 'site-settings', 'engagement-submissions'
  ]) AS resource
  CROSS JOIN unnest(ARRAY['read', 'create', 'update', 'publish', 'delete']) AS action
), all_permission(code) AS (
  SELECT code FROM canonical_permission
  UNION ALL
  SELECT code FROM cms_permission
)
DELETE FROM app_capabilities capability
WHERE NOT EXISTS (
  SELECT 1
  FROM all_permission
  WHERE all_permission.code = capability.code
);
