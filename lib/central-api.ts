// ZeroTier Central API v1 — Typed Client
// Base: https://api.zerotier.com/api/v1

// ─── Types ───────────────────────────────────────────────────────────

export interface ZTNetwork {
  id: string;
  clock: number;
  config: ZTNetworkConfig;
  description: string;
  rulesSource: string;
  permissions: Record<string, { a: boolean; d: boolean; m: boolean; r: boolean }>;
  ownerId: string;
  onlineMemberCount: number;
  authorizedMemberCount: number;
  totalMemberCount: number;
  capabilitiesByName: Record<string, unknown>;
  tagsByName: Record<string, unknown>;
}

export interface ZTNetworkConfig {
  id: string;
  creationTime: number;
  capabilities: Record<string, unknown>[];
  dns: { domain: string; servers: string[] };
  enableBroadcast: boolean;
  ipAssignmentPools: { ipRangeStart: string; ipRangeEnd: string }[];
  lastModified: number;
  mtu: number;
  multicastLimit: number;
  name: string;
  private: boolean;
  routes: { target: string; via: string | null }[];
  rules: Record<string, unknown>[];
  ssoConfig?: {
    enabled: boolean;
    mode: string;
    clientId: string;
    issuer: string;
    provider: string;
    authorizationEndpoint: string;
    allowList: string[];
  };
  tags: unknown[];
  v4AssignMode: { zt: boolean };
  v6AssignMode: { '6plane': boolean; rfc4193: boolean; zt: boolean };
}

export interface ZTMember {
  id: string;
  clock: number;
  networkId: string;
  nodeId: string;
  controllerId: string;
  hidden: boolean;
  name: string;
  description: string;
  config: ZTMemberConfig;
  lastOnline: number;
  lastSeen: number;
  physicalAddress: string;
  clientVersion: string;
  protocolVersion: number;
  supportsRulesEngine: boolean;
}

export interface ZTMemberConfig {
  activeBridge: boolean;
  authorized: boolean;
  capabilities: number[];
  creationTime: number;
  id: string;
  identity: string;
  ipAssignments: string[];
  lastAuthorizedTime: number;
  lastDeauthorizedTime: number;
  noAutoAssignIps: boolean;
  revision: number;
  ssoExempt: boolean;
  tags: number[][];
  vMajor: number;
  vMinor: number;
  vRev: number;
  vProto: number;
}

export interface ZTUser {
  id: string;
  type: string;
  clock: number;
  globalPermissions: Record<string, unknown>;
  displayName: string;
  email: string;
  smsNumber: string;
  tokens: Record<string, unknown>[];
}

export interface ZTOrganization {
  id: string;
  type: string;
  clock: number;
  ownerId: string;
  ownerEmail: string;
  billingEmail: string;
  displayName: string;
  members: Record<string, unknown>[];
}

export interface ZTOrganizationMember {
  orgId: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  role: string;
}

export interface ZTInvitation {
  id: string;
  orgId: string;
  email: string;
  status: string;
  creationTime: number;
}

export interface ZTStatus {
  id: string;
  type: string;
  clock: number;
  version: string;
  apiVersion: string;
  uptime: number;
  user: ZTUser;
  online: boolean;
  paidAccount: boolean;
  clusterNode: string;
  loginMethods: Record<string, unknown>;
  readOnlyMode: boolean;
  ssoEnabled: boolean;
}

export interface ZTAPIToken {
  token: string;
  tokenName: string;
}

// ─── Client ──────────────────────────────────────────────────────────

const CENTRAL_BASE = 'https://api.zerotier.com/api/v1';

async function centralFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CENTRAL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Central API ${res.status}: ${res.statusText} — ${body}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── Network ─────────────────────────────────────────────────────────

export async function listNetworks(token: string): Promise<ZTNetwork[]> {
  return centralFetch('/network', token);
}

export async function createNetwork(
  token: string,
  config?: Partial<ZTNetworkConfig>
): Promise<ZTNetwork> {
  return centralFetch('/network', token, {
    method: 'POST',
    body: JSON.stringify(config ? { config } : {}),
  });
}

export async function getNetwork(token: string, networkId: string): Promise<ZTNetwork> {
  return centralFetch(`/network/${networkId}`, token);
}

export async function updateNetwork(
  token: string,
  networkId: string,
  update: { config?: Partial<ZTNetworkConfig>; description?: string; rulesSource?: string }
): Promise<ZTNetwork> {
  return centralFetch(`/network/${networkId}`, token, {
    method: 'POST',
    body: JSON.stringify(update),
  });
}

export async function deleteNetwork(token: string, networkId: string): Promise<void> {
  await centralFetch(`/network/${networkId}`, token, { method: 'DELETE' });
}

// ─── Network Members ─────────────────────────────────────────────────

export async function listMembers(token: string, networkId: string): Promise<ZTMember[]> {
  return centralFetch(`/network/${networkId}/member`, token);
}

export async function getMember(
  token: string,
  networkId: string,
  memberId: string
): Promise<ZTMember> {
  return centralFetch(`/network/${networkId}/member/${memberId}`, token);
}

export async function updateMember(
  token: string,
  networkId: string,
  memberId: string,
  update: {
    name?: string;
    description?: string;
    hidden?: boolean;
    config?: Partial<ZTMemberConfig>;
  }
): Promise<ZTMember> {
  return centralFetch(`/network/${networkId}/member/${memberId}`, token, {
    method: 'POST',
    body: JSON.stringify(update),
  });
}

export async function authorizeMember(
  token: string,
  networkId: string,
  memberId: string,
  authorized: boolean
): Promise<ZTMember> {
  return updateMember(token, networkId, memberId, {
    config: { authorized },
  });
}

export async function deleteMember(
  token: string,
  networkId: string,
  memberId: string
): Promise<void> {
  await centralFetch(`/network/${networkId}/member/${memberId}`, token, {
    method: 'DELETE',
  });
}

// ─── User ────────────────────────────────────────────────────────────

export async function getUser(token: string, userId: string): Promise<ZTUser> {
  return centralFetch(`/user/${userId}`, token);
}

export async function updateUser(
  token: string,
  userId: string,
  update: { displayName?: string; smsNumber?: string }
): Promise<ZTUser> {
  return centralFetch(`/user/${userId}`, token, {
    method: 'POST',
    body: JSON.stringify(update),
  });
}

export async function deleteUser(token: string, userId: string): Promise<void> {
  await centralFetch(`/user/${userId}`, token, { method: 'DELETE' });
}

// ─── API Tokens ──────────────────────────────────────────────────────

export async function addAPIToken(
  token: string,
  userId: string,
  tokenName: string
): Promise<ZTAPIToken> {
  return centralFetch(`/user/${userId}/token`, token, {
    method: 'POST',
    body: JSON.stringify({ tokenName }),
  });
}

export async function deleteAPIToken(
  token: string,
  userId: string,
  tokenName: string
): Promise<void> {
  await centralFetch(`/user/${userId}/token/${tokenName}`, token, {
    method: 'DELETE',
  });
}

// ─── Organizations ───────────────────────────────────────────────────

export async function getOrganization(token: string): Promise<ZTOrganization> {
  return centralFetch('/org', token);
}

export async function getOrganizationById(
  token: string,
  orgId: string
): Promise<ZTOrganization> {
  return centralFetch(`/org/${orgId}`, token);
}

export async function getOrganizationMembers(
  token: string,
  orgId: string
): Promise<ZTOrganizationMember[]> {
  return centralFetch(`/org/${orgId}/members`, token);
}

export async function listInvitations(
  token: string,
  orgId: string
): Promise<ZTInvitation[]> {
  return centralFetch(`/org/${orgId}/invitation`, token);
}

export async function inviteUserByEmail(
  token: string,
  orgId: string,
  email: string
): Promise<ZTInvitation> {
  return centralFetch(`/org/${orgId}/invitation`, token, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getInvitation(
  token: string,
  orgId: string,
  invitationId: string
): Promise<ZTInvitation> {
  return centralFetch(`/org/${orgId}/invitation/${invitationId}`, token);
}

export async function acceptInvitation(
  token: string,
  orgId: string,
  invitationId: string
): Promise<void> {
  await centralFetch(`/org/${orgId}/invitation/${invitationId}/accept`, token, {
    method: 'POST',
  });
}

export async function declineInvitation(
  token: string,
  orgId: string,
  invitationId: string
): Promise<void> {
  await centralFetch(`/org/${orgId}/invitation/${invitationId}/decline`, token, {
    method: 'POST',
  });
}

// ─── Util ────────────────────────────────────────────────────────────

export async function getStatus(token: string): Promise<ZTStatus> {
  return centralFetch('/status', token);
}

export async function getRandomToken(token: string): Promise<{ token: string; clock: number }> {
  return centralFetch('/randomToken', token);
}
