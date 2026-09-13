import assert from "node:assert/strict";

export async function verifyAccess(options) {
  const {
    applicantCookie,
    cmsCookie,
    get,
    operationsCookie,
  } = options;
  const unauthenticatedCms = await get("/cms");
  assert.equal(
    unauthenticatedCms.headers.get("location"),
    "/sign-in?next=/cms",
  );

  const applicantMe = await get("/api/auth/me", applicantCookie);
  assert.equal(applicantMe.status, 200);
  assert((await applicantMe.json()).user.capabilities.includes("application.read.own"));
  assert.equal((await get("/portal", applicantCookie)).status, 200);
  assert.equal(
    (await get("/admin", applicantCookie)).headers.get("location"),
    "/unauthorized",
  );
  assert.equal(
    (await get("/cms", applicantCookie)).headers.get("location"),
    "/unauthorized",
  );

  const applicantCmsPrincipal = await get(
    "/api/cms-principals/me",
    applicantCookie,
  );
  assert.equal((await applicantCmsPrincipal.json()).user, null);

  const cmsMe = await get("/api/cms-principals/me", cmsCookie);
  assert.equal(cmsMe.status, 403);
  const cmsPage = await get("/cms", cmsCookie);
  assert.equal(
    cmsPage.status,
    200,
    `CMS editor redirect: ${cmsPage.headers.get("location")}`,
  );
  assert.equal(
    (await get("/admin", cmsCookie)).headers.get("location"),
    "/unauthorized",
  );

  assert.equal((await get("/admin", operationsCookie)).status, 200);
}

export async function verifySystemAdministrator(cookie, get) {
  const response = await get("/api/auth/me", cookie);
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.userType, "staff");
  assert(user.roles.includes("system_administrator"));
  assert(user.capabilities.includes("cms.principals.manage"));
  assert.equal((await get("/cms", cookie)).status, 200);
}

export async function verifyRuntimeAuthorizationRevocation(options) {
  const {
    cmsCookie,
    cmsEmail,
    get,
    pool,
  } = options;

  await pool.query(`
    DELETE FROM app_user_roles
    USING app_users, app_roles
    WHERE app_user_roles.user_id = app_users.id
      AND app_user_roles.role_id = app_roles.id
      AND app_users.email = $1
      AND app_roles.code = 'cms_editor'`, [cmsEmail]);

  assert.equal(
    (await get("/cms", cmsCookie)).headers.get("location"),
    "/unauthorized",
  );

  await pool.query(`
    INSERT INTO app_user_roles (user_id, role_id)
    SELECT app_users.id, app_roles.id
    FROM app_users CROSS JOIN app_roles
    WHERE app_users.email = $1
      AND app_roles.code = 'cms_editor'
    ON CONFLICT DO NOTHING`, [cmsEmail]);

  await pool.query(
    "UPDATE app_users SET status = 'disabled' WHERE email = $1",
    [cmsEmail],
  );

  assert.equal(
    (await get("/cms", cmsCookie)).headers.get("location"),
    "/unauthorized",
  );

  await pool.query(
    "UPDATE app_users SET status = 'active' WHERE email = $1",
    [cmsEmail],
  );

  assert.equal((await get("/cms", cmsCookie)).status, 200);
}

export async function verifyImmutableAuthorizationAudit(options) {
  const {
    actorId,
    pool,
  } = options;
  const result = await pool.query(
    "SELECT id FROM app_authorization_audit_entries WHERE actor_id = $1 LIMIT 1",
    [actorId],
  );
  const auditEntry = result.rows[0];

  assert(auditEntry, "The bootstrap role change did not create an audit entry");
  await assert.rejects(
    pool.query(
      "UPDATE app_authorization_audit_entries SET changes = changes WHERE id = $1",
      [auditEntry.id],
    ),
    /authorization audit entries are immutable/,
  );
}
