UPDATE app_notification_template_versions
SET html_template = replace(
    html_template,
    'style="display:inline-block;padding:',
    'style="display:inline-block;background-color:#0a183b;padding:'
  )
WHERE html_template LIKE '%style="display:inline-block;padding:%'
  AND html_template NOT LIKE '%background-color:#0a183b%';
