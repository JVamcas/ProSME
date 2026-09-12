import assert from "node:assert/strict";

export async function verifyAccess(options) {
  const {
    applicantCookie,
    cmsCookie,
    cmsEmail,
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
  assert.equal(cmsMe.status, 200);
  assert.equal((await cmsMe.json()).user.email, cmsEmail);
  assert.equal((await get("/cms", cmsCookie)).status, 200);
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
