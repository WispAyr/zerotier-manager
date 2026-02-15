#!/usr/bin/env node

// ZeroTier MCP Server — Exposes ALL ZeroTier API functions as MCP tools
// Supports both Central API (cloud) and Service API (local node)
// Includes comprehensive knowledge base for ZeroTier concepts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as central from '../lib/central-api.js';
import * as service from '../lib/service-api.js';
import { runDiagnostics } from '../lib/diagnostics.js';
import * as knowledge from '../lib/knowledge.js';

const server = new McpServer({
    name: 'zerotier',
    version: '1.0.0',
});

// ═══════════════════════════════════════════════════════════════════════
// CENTRAL API TOOLS — Network Management (Cloud)
// ═══════════════════════════════════════════════════════════════════════

// ─── Networks ────────────────────────────────────────────────────────

server.tool(
    'central_list_networks',
    'List all ZeroTier networks you have access to via the Central API',
    { token: z.string().describe('ZeroTier Central API token') },
    async ({ token }) => {
        try {
            const networks = await central.listNetworks(token);
            return { content: [{ type: 'text', text: JSON.stringify(networks, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_create_network',
    'Create a new ZeroTier network. Returns the new network config.',
    {
        token: z.string().describe('ZeroTier Central API token'),
        name: z.string().optional().describe('Network name'),
        private: z.boolean().optional().describe('Whether the network requires member authorization (default: true)'),
        enableBroadcast: z.boolean().optional().describe('Enable broadcast (default: true)'),
        mtu: z.number().optional().describe('MTU (default: 2800)'),
        multicastLimit: z.number().optional().describe('Multicast limit (default: 32)'),
        ipRangeStart: z.string().optional().describe('IP assignment pool start (e.g., "10.0.0.1")'),
        ipRangeEnd: z.string().optional().describe('IP assignment pool end (e.g., "10.0.0.254")'),
        routeTarget: z.string().optional().describe('Managed route target CIDR (e.g., "10.0.0.0/24")'),
    },
    async ({ token, name, private: isPrivate, enableBroadcast, mtu, multicastLimit, ipRangeStart, ipRangeEnd, routeTarget }) => {
        try {
            const config: Record<string, unknown> = {};
            if (name !== undefined) config.name = name;
            if (isPrivate !== undefined) config.private = isPrivate;
            if (enableBroadcast !== undefined) config.enableBroadcast = enableBroadcast;
            if (mtu !== undefined) config.mtu = mtu;
            if (multicastLimit !== undefined) config.multicastLimit = multicastLimit;
            if (ipRangeStart && ipRangeEnd) {
                config.ipAssignmentPools = [{ ipRangeStart, ipRangeEnd }];
            }
            if (routeTarget) {
                config.routes = [{ target: routeTarget, via: null }];
            }
            config.v4AssignMode = { zt: true };
            const network = await central.createNetwork(token, config as Partial<central.ZTNetworkConfig>);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_network',
    'Get detailed information about a specific ZeroTier network',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID (16 hex chars)'),
    },
    async ({ token, networkId }) => {
        try {
            const network = await central.getNetwork(token, networkId);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_update_network',
    'Update a ZeroTier network configuration (name, description, routes, IP pools, DNS, SSO, rules, etc.)',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
        name: z.string().optional().describe('New network name'),
        description: z.string().optional().describe('Network description'),
        private: z.boolean().optional().describe('Require member authorization'),
        enableBroadcast: z.boolean().optional().describe('Enable broadcast'),
        mtu: z.number().optional().describe('MTU value'),
        multicastLimit: z.number().optional().describe('Multicast recipient limit'),
        rulesSource: z.string().optional().describe('Flow rules source code'),
        dnsDomain: z.string().optional().describe('DNS domain'),
        dnsServers: z.array(z.string()).optional().describe('DNS server IPs'),
        ipAssignmentPools: z.array(z.object({ ipRangeStart: z.string(), ipRangeEnd: z.string() })).optional().describe('IP assignment pools'),
        routes: z.array(z.object({ target: z.string(), via: z.string().nullable() })).optional().describe('Managed routes'),
        v4AssignMode: z.object({ zt: z.boolean() }).optional().describe('IPv4 assign mode'),
        v6AssignMode: z.object({ '6plane': z.boolean(), rfc4193: z.boolean(), zt: z.boolean() }).optional().describe('IPv6 assign mode'),
    },
    async ({ token, networkId, name, description, rulesSource, dnsDomain, dnsServers, ...configFields }) => {
        try {
            const config: Record<string, unknown> = {};
            const update: Record<string, unknown> = {};

            if (name !== undefined) config.name = name;
            Object.entries(configFields).forEach(([k, v]) => { if (v !== undefined) config[k] = v; });
            if (dnsDomain || dnsServers) {
                config.dns = { domain: dnsDomain || '', servers: dnsServers || [] };
            }
            if (Object.keys(config).length > 0) update.config = config;
            if (description !== undefined) update.description = description;
            if (rulesSource !== undefined) update.rulesSource = rulesSource;

            const network = await central.updateNetwork(token, networkId, update as Parameters<typeof central.updateNetwork>[2]);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_delete_network',
    'Permanently delete a ZeroTier network. This cannot be undone!',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID to delete'),
    },
    async ({ token, networkId }) => {
        try {
            await central.deleteNetwork(token, networkId);
            return { content: [{ type: 'text', text: `Network ${networkId} deleted successfully.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── Members ─────────────────────────────────────────────────────────

server.tool(
    'central_list_members',
    'List all members of a ZeroTier network with their status, IPs, and configuration',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
    },
    async ({ token, networkId }) => {
        try {
            const members = await central.listMembers(token, networkId);
            return { content: [{ type: 'text', text: JSON.stringify(members, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_member',
    'Get detailed information about a specific member on a network',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
        memberId: z.string().describe('Member node ID (10 hex chars)'),
    },
    async ({ token, networkId, memberId }) => {
        try {
            const member = await central.getMember(token, networkId, memberId);
            return { content: [{ type: 'text', text: JSON.stringify(member, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_update_member',
    'Update a network member (name, description, IP assignments, bridge mode, SSO exemption, capabilities, tags)',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
        memberId: z.string().describe('Member node ID'),
        name: z.string().optional().describe('Member name'),
        description: z.string().optional().describe('Member description'),
        hidden: z.boolean().optional().describe('Hide member from list'),
        authorized: z.boolean().optional().describe('Authorize or deauthorize member'),
        activeBridge: z.boolean().optional().describe('Enable/disable bridge mode'),
        ipAssignments: z.array(z.string()).optional().describe('IP addresses to assign'),
        noAutoAssignIps: z.boolean().optional().describe('Disable automatic IP assignment'),
        ssoExempt: z.boolean().optional().describe('Exempt from SSO requirement'),
        capabilities: z.array(z.number()).optional().describe('Capability IDs'),
        tags: z.array(z.array(z.number())).optional().describe('Tag ID/value pairs'),
    },
    async ({ token, networkId, memberId, name, description, hidden, ...configFields }) => {
        try {
            const update: Record<string, unknown> = {};
            const config: Record<string, unknown> = {};

            if (name !== undefined) update.name = name;
            if (description !== undefined) update.description = description;
            if (hidden !== undefined) update.hidden = hidden;
            Object.entries(configFields).forEach(([k, v]) => { if (v !== undefined) config[k] = v; });
            if (Object.keys(config).length > 0) update.config = config;

            const member = await central.updateMember(token, networkId, memberId, update as Parameters<typeof central.updateMember>[3]);
            return { content: [{ type: 'text', text: JSON.stringify(member, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_authorize_member',
    'Authorize or deauthorize a member on a network (shortcut for update_member)',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
        memberId: z.string().describe('Member node ID'),
        authorized: z.boolean().describe('true to authorize, false to deauthorize'),
    },
    async ({ token, networkId, memberId, authorized }) => {
        try {
            const member = await central.authorizeMember(token, networkId, memberId, authorized);
            return { content: [{ type: 'text', text: `Member ${memberId} ${authorized ? 'authorized' : 'deauthorized'} on network ${networkId}.\n\n${JSON.stringify(member, null, 2)}` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_delete_member',
    'Remove a member from a network permanently',
    {
        token: z.string().describe('ZeroTier Central API token'),
        networkId: z.string().describe('Network ID'),
        memberId: z.string().describe('Member node ID'),
    },
    async ({ token, networkId, memberId }) => {
        try {
            await central.deleteMember(token, networkId, memberId);
            return { content: [{ type: 'text', text: `Member ${memberId} removed from network ${networkId}.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── User ────────────────────────────────────────────────────────────

server.tool(
    'central_get_user',
    'Get user account information',
    {
        token: z.string().describe('ZeroTier Central API token'),
        userId: z.string().describe('User ID (use "self" or UUID)'),
    },
    async ({ token, userId }) => {
        try {
            const user = await central.getUser(token, userId);
            return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_update_user',
    'Update user display name or SMS number',
    {
        token: z.string().describe('ZeroTier Central API token'),
        userId: z.string().describe('User ID'),
        displayName: z.string().optional().describe('New display name'),
        smsNumber: z.string().optional().describe('New SMS number'),
    },
    async ({ token, userId, displayName, smsNumber }) => {
        try {
            const update: Record<string, string> = {};
            if (displayName) update.displayName = displayName;
            if (smsNumber) update.smsNumber = smsNumber;
            const user = await central.updateUser(token, userId, update);
            return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_delete_user',
    'Delete a user account. This is irreversible!',
    {
        token: z.string().describe('ZeroTier Central API token'),
        userId: z.string().describe('User ID to delete'),
    },
    async ({ token, userId }) => {
        try {
            await central.deleteUser(token, userId);
            return { content: [{ type: 'text', text: `User ${userId} deleted.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── API Tokens ──────────────────────────────────────────────────────

server.tool(
    'central_add_api_token',
    'Create a new API token for a user',
    {
        token: z.string().describe('ZeroTier Central API token'),
        userId: z.string().describe('User ID'),
        tokenName: z.string().describe('Name for the new token'),
    },
    async ({ token, userId, tokenName }) => {
        try {
            const result = await central.addAPIToken(token, userId, tokenName);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_delete_api_token',
    'Delete an API token',
    {
        token: z.string().describe('ZeroTier Central API token'),
        userId: z.string().describe('User ID'),
        tokenName: z.string().describe('Name of the token to delete'),
    },
    async ({ token, userId, tokenName }) => {
        try {
            await central.deleteAPIToken(token, userId, tokenName);
            return { content: [{ type: 'text', text: `Token "${tokenName}" deleted.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── Organizations ───────────────────────────────────────────────────

server.tool(
    'central_get_organization',
    'Get the current user\'s organization',
    { token: z.string().describe('ZeroTier Central API token') },
    async ({ token }) => {
        try {
            const org = await central.getOrganization(token);
            return { content: [{ type: 'text', text: JSON.stringify(org, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_organization_by_id',
    'Get organization details by ID',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
    },
    async ({ token, orgId }) => {
        try {
            const org = await central.getOrganizationById(token, orgId);
            return { content: [{ type: 'text', text: JSON.stringify(org, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_organization_members',
    'Get list of organization members',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
    },
    async ({ token, orgId }) => {
        try {
            const members = await central.getOrganizationMembers(token, orgId);
            return { content: [{ type: 'text', text: JSON.stringify(members, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_list_invitations',
    'List pending organization invitations',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
    },
    async ({ token, orgId }) => {
        try {
            const invitations = await central.listInvitations(token, orgId);
            return { content: [{ type: 'text', text: JSON.stringify(invitations, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_invite_user_by_email',
    'Invite a user to your organization by email',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
        email: z.string().describe('Email address to invite'),
    },
    async ({ token, orgId, email }) => {
        try {
            const invitation = await central.inviteUserByEmail(token, orgId, email);
            return { content: [{ type: 'text', text: JSON.stringify(invitation, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_invitation',
    'Get details of a specific organization invitation',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
        invitationId: z.string().describe('Invitation ID'),
    },
    async ({ token, orgId, invitationId }) => {
        try {
            const invitation = await central.getInvitation(token, orgId, invitationId);
            return { content: [{ type: 'text', text: JSON.stringify(invitation, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_accept_invitation',
    'Accept an organization invitation',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
        invitationId: z.string().describe('Invitation ID'),
    },
    async ({ token, orgId, invitationId }) => {
        try {
            await central.acceptInvitation(token, orgId, invitationId);
            return { content: [{ type: 'text', text: `Invitation ${invitationId} accepted.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_decline_invitation',
    'Decline an organization invitation',
    {
        token: z.string().describe('ZeroTier Central API token'),
        orgId: z.string().describe('Organization ID'),
        invitationId: z.string().describe('Invitation ID'),
    },
    async ({ token, orgId, invitationId }) => {
        try {
            await central.declineInvitation(token, orgId, invitationId);
            return { content: [{ type: 'text', text: `Invitation ${invitationId} declined.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── Utility ─────────────────────────────────────────────────────────

server.tool(
    'central_get_status',
    'Get the overall status of the ZeroTier Central account',
    { token: z.string().describe('ZeroTier Central API token') },
    async ({ token }) => {
        try {
            const status = await central.getStatus(token);
            return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'central_get_random_token',
    'Generate a random 32-character token',
    { token: z.string().describe('ZeroTier Central API token') },
    async ({ token }) => {
        try {
            const result = await central.getRandomToken(token);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════
// SERVICE API TOOLS — Local Node Management
// ═══════════════════════════════════════════════════════════════════════

server.tool(
    'service_get_status',
    'Get the local ZeroTier node status (address, version, online state, settings)',
    {},
    async () => {
        try {
            const status = await service.getServiceStatus();
            return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_list_joined_networks',
    'List all networks the local node has joined',
    {},
    async () => {
        try {
            const networks = await service.getJoinedNetworks();
            return { content: [{ type: 'text', text: JSON.stringify(networks, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_get_joined_network',
    'Get details of a specific joined network on the local node',
    { networkId: z.string().describe('Network ID') },
    async ({ networkId }) => {
        try {
            const network = await service.getJoinedNetwork(networkId);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_join_network',
    'Join a ZeroTier network on the local node',
    {
        networkId: z.string().describe('Network ID to join (16 hex chars)'),
        allowManaged: z.boolean().optional().describe('Allow managed routes'),
        allowGlobal: z.boolean().optional().describe('Allow global routes'),
        allowDefault: z.boolean().optional().describe('Allow default route override'),
        allowDNS: z.boolean().optional().describe('Allow DNS configuration'),
    },
    async ({ networkId, allowManaged, allowGlobal, allowDefault, allowDNS }) => {
        try {
            const config: Record<string, boolean> = {};
            if (allowManaged !== undefined) config.allowManaged = allowManaged;
            if (allowGlobal !== undefined) config.allowGlobal = allowGlobal;
            if (allowDefault !== undefined) config.allowDefault = allowDefault;
            if (allowDNS !== undefined) config.allowDNS = allowDNS;
            const network = await service.joinNetwork(networkId, Object.keys(config).length > 0 ? config : undefined);
            return { content: [{ type: 'text', text: `Joined network ${networkId}.\n\n${JSON.stringify(network, null, 2)}` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_leave_network',
    'Leave a ZeroTier network on the local node',
    { networkId: z.string().describe('Network ID to leave') },
    async ({ networkId }) => {
        try {
            await service.leaveNetwork(networkId);
            return { content: [{ type: 'text', text: `Left network ${networkId}.` }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_list_peers',
    'List all peers the local node is communicating with (shows latency, path info, roles)',
    {},
    async () => {
        try {
            const peers = await service.getPeers();
            return { content: [{ type: 'text', text: JSON.stringify(peers, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_get_peer',
    'Get detailed information about a specific peer',
    { peerId: z.string().describe('Peer node ID (10 hex chars)') },
    async ({ peerId }) => {
        try {
            const peer = await service.getPeer(peerId);
            return { content: [{ type: 'text', text: JSON.stringify(peer, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ─── Controller ──────────────────────────────────────────────────────

server.tool(
    'service_get_controller_status',
    'Get the local controller status (if node is acting as a network controller)',
    {},
    async () => {
        try {
            const status = await service.getControllerStatus();
            return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_list_controller_networks',
    'List all networks managed by the local controller',
    {},
    async () => {
        try {
            const networks = await service.getControllerNetworks();
            return { content: [{ type: 'text', text: JSON.stringify(networks, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_get_controller_network',
    'Get details of a controller-managed network',
    { networkId: z.string().describe('Network ID') },
    async ({ networkId }) => {
        try {
            const network = await service.getControllerNetwork(networkId);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_create_controller_network',
    'Create or update a network on the local controller',
    {
        networkId: z.string().describe('Network ID (use node address + 6 hex chars, or existing ID)'),
        name: z.string().optional().describe('Network name'),
        private: z.boolean().optional().describe('Require authorization'),
        enableBroadcast: z.boolean().optional().describe('Enable broadcast'),
        mtu: z.number().optional().describe('MTU'),
        multicastLimit: z.number().optional().describe('Multicast limit'),
        ipAssignmentPools: z.array(z.object({ ipRangeStart: z.string(), ipRangeEnd: z.string() })).optional(),
        routes: z.array(z.object({ target: z.string(), via: z.string().nullable() })).optional(),
    },
    async ({ networkId, ...config }) => {
        try {
            const cleanConfig: Record<string, unknown> = {};
            Object.entries(config).forEach(([k, v]) => { if (v !== undefined) cleanConfig[k] = v; });
            const network = await service.createOrUpdateControllerNetwork(networkId, cleanConfig as Partial<service.ControllerNetwork>);
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_generate_controller_network_id',
    'Generate a random network ID for the local controller',
    {},
    async () => {
        try {
            const network = await service.generateControllerNetworkId();
            return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_list_controller_members',
    'List members of a controller-managed network',
    { networkId: z.string().describe('Network ID') },
    async ({ networkId }) => {
        try {
            const members = await service.getControllerNetworkMembers(networkId);
            return { content: [{ type: 'text', text: JSON.stringify(members, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

server.tool(
    'service_get_controller_member',
    'Get details of a member on a controller-managed network',
    {
        networkId: z.string().describe('Network ID'),
        memberId: z.string().describe('Member node ID'),
    },
    async ({ networkId, memberId }) => {
        try {
            const member = await service.getControllerNetworkMember(networkId, memberId);
            return { content: [{ type: 'text', text: JSON.stringify(member, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════
// DIAGNOSTICS TOOLS
// ═══════════════════════════════════════════════════════════════════════

server.tool(
    'run_diagnostics',
    'Run comprehensive ZeroTier network diagnostics — checks connectivity, latency, relay status, NAT issues, IP conflicts, version mismatches, unauthorized members, and more',
    {
        token: z.string().optional().describe('ZeroTier Central API token (optional, enables network-level checks)'),
    },
    async ({ token }) => {
        try {
            const report = await runDiagnostics(token);
            return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
        }
    }
);

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE TOOLS — ZeroTier Concepts & Education
// ═══════════════════════════════════════════════════════════════════════

server.tool(
    'knowledge_search',
    'Search the ZeroTier knowledge base by keyword. Useful for explaining ZeroTier concepts to users in plain language.',
    { query: z.string().describe('Search term (e.g., "NAT", "relay", "encryption", "flow rules")') },
    async ({ query }) => {
        const articles = knowledge.searchArticles(query);
        if (articles.length === 0) {
            return { content: [{ type: 'text', text: `No articles found matching "${query}". Try broader terms like "networking", "security", or "troubleshooting".` }] };
        }
        const results = articles.map(a => ({
            id: a.id,
            title: a.title,
            category: a.category,
            summary: a.summary,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
);

server.tool(
    'knowledge_get_article',
    'Get a full knowledge base article by ID. Returns comprehensive, beginner-friendly explanation of a ZeroTier concept.',
    { articleId: z.string().describe('Article ID (e.g., "what-is-zerotier", "direct-vs-relay", "nat-types", "flow-rules")') },
    async ({ articleId }) => {
        const article = knowledge.getArticleById(articleId);
        if (!article) {
            const all = knowledge.knowledgeBase.map(a => `  - ${a.id}: ${a.title}`).join('\n');
            return { content: [{ type: 'text', text: `Article "${articleId}" not found. Available articles:\n${all}` }] };
        }
        return { content: [{ type: 'text', text: `# ${article.title}\n\n**Category**: ${knowledge.categoryLabels[article.category]}\n**Summary**: ${article.summary}\n\n${article.content}\n\n**Related**: ${(article.relatedArticles || []).join(', ')}` }] };
    }
);

server.tool(
    'knowledge_list_categories',
    'List all knowledge base categories and the number of articles in each',
    {},
    async () => {
        const cats = knowledge.getAllCategories();
        const result = cats.map(c => ({
            category: c.category,
            label: knowledge.categoryLabels[c.category],
            description: knowledge.categoryDescriptions[c.category],
            articleCount: c.count,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'knowledge_get_category',
    'Get all articles in a specific knowledge base category',
    { category: z.enum(['fundamentals', 'networking', 'security', 'troubleshooting', 'configuration', 'architecture', 'advanced']).describe('Category name') },
    async ({ category }) => {
        const articles = knowledge.getArticlesByCategory(category);
        const results = articles.map(a => ({
            id: a.id,
            title: a.title,
            summary: a.summary,
            content: a.content,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
);

// ─── Start Server ────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('ZeroTier MCP Server running on stdio');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
