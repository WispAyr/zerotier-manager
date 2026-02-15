// ZeroTier Knowledge Base — Comprehensive explanations for novice-to-advanced users
// Used in both the web UI (contextual help) and MCP server (resources)

export interface KnowledgeArticle {
    id: string;
    title: string;
    category: KnowledgeCategory;
    summary: string;
    content: string;
    relatedArticles?: string[];
}

export type KnowledgeCategory =
    | 'fundamentals'
    | 'networking'
    | 'security'
    | 'troubleshooting'
    | 'configuration'
    | 'architecture'
    | 'advanced';

export const knowledgeBase: KnowledgeArticle[] = [
    // ═══════════════════════════════════════════════════════════════════
    // FUNDAMENTALS
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'what-is-zerotier',
        title: 'What is ZeroTier?',
        category: 'fundamentals',
        summary: 'ZeroTier creates secure virtual networks that connect devices anywhere in the world as if they were on the same local network.',
        content: `# What is ZeroTier?

ZeroTier is a **software-defined networking (SDN)** platform that creates virtual networks connecting your devices over the internet. Think of it like a VPN, but more flexible and peer-to-peer.

## The Simple Explanation
Imagine you have computers at home, at work, and in the cloud. Normally, they can't talk to each other directly because they're on different networks behind different routers. ZeroTier creates a virtual network that makes all these devices appear to be on the **same local network**, no matter where they physically are.

## How It Works
1. **You create a network** on ZeroTier Central (the management portal)
2. **You install ZeroTier** on each device you want to connect
3. **Each device joins your network** using the network ID
4. **You authorize each device** (on private networks)
5. **Devices can now communicate** as if they're all plugged into the same switch

## Key Benefits
- **Zero configuration networking**: No port forwarding, no firewall rules, no dynamic DNS needed
- **End-to-end encryption**: All traffic is encrypted between peers
- **Peer-to-peer**: Traffic goes directly between devices when possible, not through a central server
- **Works anywhere**: Behind NATs, firewalls, on mobile networks — ZeroTier finds a way
- **Flat network**: Every device gets a virtual IP address on the same subnet

## Real-World Uses
- Remote access to home lab servers
- Connecting IoT devices across locations
- Gaming LAN parties over the internet
- Secure connections between cloud servers
- Remote desktop without exposing ports`,
        relatedArticles: ['network-id', 'node-id', 'central-vs-service'],
    },
    {
        id: 'network-id',
        title: 'Network IDs Explained',
        category: 'fundamentals',
        summary: 'A Network ID is a unique 16-character hex string that identifies your ZeroTier network.',
        content: `# Network IDs

A **Network ID** is a 16-character hexadecimal string (e.g., \`8056c2e21c000001\`) that uniquely identifies a ZeroTier virtual network worldwide.

## Structure
The Network ID is composed of two parts:
- **First 10 characters**: The Node ID of the network controller
- **Last 6 characters**: A network number assigned by that controller

For example, in \`8056c2e21c000001\`:
- \`8056c2e21c\` = the controller's Node ID
- \`000001\` = network number on that controller

## Why This Matters
- The Network ID tells ZeroTier how to find the controller that manages the network
- If you self-host a controller, the first 10 chars will be your node's ID
- ZeroTier Central networks use ZeroTier's hosted controllers

## How to Use
- **Join**: \`zerotier-cli join <networkId>\` or enter it in the app
- **Share**: Give this ID to others so they can join your network
- **Keep it private**: Anyone with the ID can request to join (though on private networks they still need authorization)`,
        relatedArticles: ['node-id', 'what-is-zerotier'],
    },
    {
        id: 'node-id',
        title: 'Node IDs (ZeroTier Addresses)',
        category: 'fundamentals',
        summary: 'Every ZeroTier installation has a unique 10-character address that identifies it globally.',
        content: `# Node IDs (ZeroTier Addresses)

Every ZeroTier installation generates a unique **10-character hexadecimal address** (e.g., \`a1b2c3d4e5\`). This is your node's identity on the ZeroTier network.

## Key Facts
- **Globally unique**: No two nodes share the same ID
- **Persistent**: The ID stays the same across reboots (stored in \`identity.secret\`)
- **Cryptographic**: Derived from a public/private key pair
- **Cannot be changed**: If you need a new ID, you must reset the node (delete identity files)

## Where You'll See It
- In the system tray / menu bar app
- In \`zerotier-cli info\` output
- In the network member list on ZeroTier Central
- As the "address" field in API responses

## Identity Files
ZeroTier stores two files in its working directory:
- \`identity.public\` — Your public key (safe to share)
- \`identity.secret\` — Your private key (**never share this!**)

If you delete these files and restart ZeroTier, you'll get a completely new Node ID and will need to re-authorize on all networks.`,
        relatedArticles: ['network-id', 'authorization'],
    },
    {
        id: 'central-vs-service',
        title: 'Central API vs Service API',
        category: 'fundamentals',
        summary: 'ZeroTier has two APIs: Central (cloud management) and Service (local node control).',
        content: `# Central API vs Service API

ZeroTier provides two separate APIs that serve different purposes:

## Central API (api.zerotier.com)
- **What it does**: Manages your networks from the cloud
- **Authentication**: API token from your account page
- **Scope**: All your networks, all members, organization management
- **Use when**: Creating/configuring networks, managing members, checking who's online
- **Rate limits**: 100 req/s (paid) or 20 req/s (free)

### Central API can:
✅ Create and delete networks
✅ Authorize/deauthorize members
✅ Configure IP pools, routes, DNS, flow rules
✅ View member online status and client versions
✅ Manage your organization and invitations

## Service API (localhost:9993)
- **What it does**: Controls the ZeroTier service on your local machine
- **Authentication**: Token from \`authtoken.secret\` file
- **Scope**: Only the local node — its networks, its peers
- **Use when**: Joining/leaving networks, checking peer connectivity

### Service API can:
✅ Join and leave networks
✅ View peer connection details (latency, paths, roles)
✅ Check local node status
✅ Manage self-hosted controller (if running one)

## Why Both?
The Central API manages the **control plane** (who's allowed on what network), while the Service API manages the **data plane** (how your specific node connects to peers). You need both for comprehensive management.`,
        relatedArticles: ['what-is-zerotier', 'authorization'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // NETWORKING
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'direct-vs-relay',
        title: 'Direct vs Relayed Connections',
        category: 'networking',
        summary: 'ZeroTier prefers direct peer-to-peer connections but falls back to relaying through root servers when direct paths are blocked.',
        content: `# Direct vs Relayed Connections

## Direct Connections (Ideal)
ZeroTier's primary goal is establishing **direct peer-to-peer UDP connections** between devices. When successful:
- Traffic flows directly between devices
- Lowest possible latency
- No bandwidth bottleneck
- Best performance for all applications

## How Direct Connections Are Made
1. Both peers connect to ZeroTier root servers
2. Root servers help peers discover each other's public IP and port
3. Both peers attempt **UDP hole punching** through their NATs
4. If successful, they communicate directly from then on

## Relayed Connections (Fallback)
When direct connections fail, traffic is **relayed through ZeroTier root servers**:
- Higher latency (often 2-10x more)
- Traffic goes: You → Root Server → Peer
- Uses more bandwidth on root servers
- May use TCP/HTTPS fallback (even slower)

## How to Tell
- **zerotier-cli peers**: Shows "RELAY" for relayed connections
- **This dashboard**: Shows ⚠️ warning for relayed peers
- **Latency**: Relayed connections typically show higher latency

## Common Causes of Relaying
1. **Symmetric NAT** on one or both sides
2. **Firewall blocking UDP port 9993**
3. **Corporate network restrictions**
4. **ISP-level NAT (CGNAT)**

## How to Fix
1. Open UDP port 9993 outbound on both firewalls
2. Enable UPnP/NAT-PMP on your router
3. If behind symmetric NAT, set up a **Moon** server
4. Check for corporate firewall restrictions`,
        relatedArticles: ['nat-types', 'udp-hole-punching', 'moon-servers', 'root-servers'],
    },
    {
        id: 'nat-types',
        title: 'NAT Types and Their Impact',
        category: 'networking',
        summary: 'The type of NAT (Network Address Translation) you are behind significantly affects whether ZeroTier can establish direct connections.',
        content: `# NAT Types and Their Impact

**NAT (Network Address Translation)** is how your router shares one public IP among multiple devices. The type of NAT determines whether ZeroTier can make direct connections.

## NAT Types (From Best to Worst)

### 1. Full Cone NAT (Best)
- Once a mapping is created, any external host can send through it
- ZeroTier works perfectly ✅
- Direct connections almost always succeed

### 2. Address-Restricted Cone NAT (Good)
- External hosts can send if the internal host has sent to that address
- ZeroTier works well ✅
- Direct connections usually succeed via hole punching

### 3. Port-Restricted Cone NAT (OK)
- Like address-restricted, but also checks port
- ZeroTier usually works ✅
- May need a few attempts at hole punching

### 4. Symmetric NAT (Problematic) ⚠️
- Each connection to a different external address:port gets a new mapping
- **ZeroTier cannot easily hole-punch** through this
- Results in relayed connections
- Common in corporate and mobile networks

## How to Detect Symmetric NAT
Run \`zerotier-cli info -j\` and check \`surfaceAddresses\`. If you see many different port numbers that keep changing, you likely have symmetric NAT.

## Solutions for Symmetric NAT
1. **Replace the router** with one that uses cone NAT
2. **Deploy a Moon server** on a machine with a public IP
3. **Use port forwarding** to UDP port 9993 on your router
4. **Contact your ISP** about getting a public IP or less restrictive NAT`,
        relatedArticles: ['direct-vs-relay', 'udp-hole-punching', 'moon-servers'],
    },
    {
        id: 'udp-hole-punching',
        title: 'UDP Hole Punching',
        category: 'networking',
        summary: 'UDP hole punching is the technique ZeroTier uses to establish direct connections through NAT routers.',
        content: `# UDP Hole Punching

**UDP hole punching** is a technique that allows two devices behind NAT routers to establish a direct connection without any special router configuration.

## How It Works (Simplified)
1. **Both peers** send a packet to a known server (ZeroTier root server)
2. The **root server** sees the public IP:port of each peer
3. The root server **tells each peer** the other's public IP:port
4. **Both peers simultaneously** send UDP packets to each other's public IP:port
5. These outbound packets **create NAT mappings** (holes) in their routers
6. The **incoming packet** from the other peer arrives and matches the mapping
7. **Direct communication** is established! 🎉

## Why It Works
NAT routers track outbound connections and allow responses back through. By having both sides send packets at the same time, each side's router sees the incoming packet as a response to the outbound one.

## When It Fails
- **Symmetric NAT**: The port mapping changes for each destination, so the hole doesn't match
- **Firewalls blocking UDP**: If outbound UDP port 9993 is blocked entirely
- **CGNAT**: Some carrier-grade NATs are too restrictive
- **Timing issues**: In rare cases, the simultaneous sends don't align

## ZeroTier's Approach
ZeroTier tries multiple hole-punching strategies:
1. Direct UDP to the peer's known address
2. Tries both IPv4 and IPv6
3. Falls back to TCP/HTTPS relay if all else fails
4. Continuously retries direct connection in the background`,
        relatedArticles: ['nat-types', 'direct-vs-relay', 'root-servers'],
    },
    {
        id: 'root-servers',
        title: 'Root Servers (Planets)',
        category: 'architecture',
        summary: 'Root servers are ZeroTier\'s core infrastructure that helps nodes discover each other and relays traffic when direct connections fail.',
        content: `# Root Servers (Planets)

**Root servers** (called "Planets" in ZeroTier terminology) are backbone infrastructure servers operated by ZeroTier, Inc.

## What They Do
1. **Peer Discovery**: Help nodes find each other on the internet
2. **NAT Traversal**: Facilitate UDP hole punching by sharing public addresses
3. **Relay**: Forward traffic when direct connections can't be established
4. **Identity**: Provide a stable rendezvous point for the network

## Planet vs Moon
| Feature | Planet (Root) | Moon (Custom) |
|---------|--------------|---------------|
| Operated by | ZeroTier, Inc. | You |
| Global | Yes | Your infrastructure |
| Always available | Yes (SLA) | Depends on you |
| Customizable | No | Yes |
| Purpose | Global backbone | Regional optimization |

## How Nodes Use Root Servers
1. On startup, ZeroTier connects to the nearest root server
2. When joining a network, the root server helps find the controller
3. When connecting to a peer, the root server facilitates hole punching
4. If direct connection fails, traffic flows through the root server

## Security
- Root servers **cannot decrypt your traffic** — all data is end-to-end encrypted
- Root servers only see encrypted packets and metadata (source/destination addresses)
- They do NOT have access to your network configurations or member lists
- That information is only on the controllers`,
        relatedArticles: ['moon-servers', 'direct-vs-relay', 'encryption'],
    },
    {
        id: 'moon-servers',
        title: 'Moon Servers (Custom Roots)',
        category: 'architecture',
        summary: 'Moon servers are private root servers you can deploy to optimize connectivity, reduce latency, and maintain connections even when internet to ZeroTier is blocked.',
        content: `# Moon Servers

A **Moon** is a user-hosted root server that supplements (or can replace) ZeroTier's built-in Planet root servers.

## Why Deploy a Moon?
1. **Reduce latency**: Place a moon in the same region as your nodes
2. **Bypass restrictions**: Maintain connectivity when corporate firewalls block ZeroTier's root servers
3. **Improve reliability**: Add redundancy by having your own relay infrastructure
4. **Air-gapped networks**: Create ZeroTier networks that don't depend on internet access to ZeroTier's infrastructure

## How to Set Up a Moon
1. Choose a server with a **static public IP address**
2. Install ZeroTier on it
3. Run \`zerotier-idtool initmoon identity.public > moon.json\`
4. Edit \`moon.json\` to add your server's public IP
5. Run \`zerotier-idtool genmoon moon.json\`
6. Share the resulting \`.moon\` file with your nodes
7. On each node: place the file in the ZeroTier \`moons.d\` directory

## When You Need One
- Nodes frequently show "RELAY" status
- You're behind symmetric NAT that can't be changed
- You need ZeroTier to work on an isolated network
- You want to reduce latency between specific regions`,
        relatedArticles: ['root-servers', 'direct-vs-relay', 'nat-types'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // SECURITY
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'authorization',
        title: 'Member Authorization',
        category: 'security',
        summary: 'On private networks, every device must be explicitly authorized before it can communicate. This prevents unauthorized access.',
        content: `# Member Authorization

## Private vs Public Networks
- **Private networks** (default): Members must be **authorized** before they can communicate. Just knowing the network ID isn't enough.
- **Public networks**: Anyone who knows the network ID can join and communicate immediately. **Use with caution!**

## The Authorization Flow
1. A new device **joins** the network (\`zerotier-cli join <networkId>\`)
2. The device appears in the member list as **"Not Authorized"**
3. A network admin **authorizes** the device (via web UI or API)
4. The device receives its network configuration (IP address, routes, rules)
5. The device can now **communicate** with other authorized members

## What Happens When Deauthorized
- The member's network config is revoked
- It can no longer send or receive traffic on the network
- Its IP address is freed (if auto-assigned)
- It remains in the member list (can be re-authorized later)
- To fully remove, use "Delete Member"

## Best Practices
- Always use **private networks** for sensitive environments
- Review and authorize members promptly
- Regularly audit your member list for unknown nodes
- Remove members that are no longer needed
- Use descriptive names so you can identify each member`,
        relatedArticles: ['node-id', 'flow-rules', 'sso-oidc'],
    },
    {
        id: 'encryption',
        title: 'End-to-End Encryption',
        category: 'security',
        summary: 'All ZeroTier traffic is encrypted end-to-end using modern cryptography. Even ZeroTier\'s own servers cannot read your data.',
        content: `# End-to-End Encryption

## How ZeroTier Encrypts
All traffic on ZeroTier networks is encrypted **end-to-end** using:
- **Curve25519** for key exchange (ECDH)
- **Salsa20/12** for symmetric encryption (in older versions)
- **AES-256-GMAC-SIV** for symmetric encryption (in newer versions, v2 protocol)
- **Ed25519** for digital signatures

## What This Means
- Traffic is encrypted **between your devices**
- ZeroTier's root servers **cannot decrypt** your data
- Even if someone intercepts packets on the internet, they **cannot read** the content
- Each peer-to-peer connection has its own encryption keys

## Key Exchange
1. Each node has a public/private key pair (the \`identity.secret\` file)
2. When two nodes connect, they perform a Diffie-Hellman key exchange
3. The resulting shared secret is used to encrypt all traffic between them
4. Keys are periodically rotated

## Trust Model
- You trust ZeroTier's root servers for **peer discovery only**
- You trust your network **controller** for access control
- You do NOT need to trust any intermediary for **data privacy**

## Network Rules Are Enforced Cryptographically
Flow rules and capabilities are signed by the controller, so members can verify them independently. A compromised relay cannot forge network rules.`,
        relatedArticles: ['root-servers', 'flow-rules', 'authorization'],
    },
    {
        id: 'flow-rules',
        title: 'Flow Rules (Network Rules Engine)',
        category: 'security',
        summary: 'Flow rules let you control exactly what traffic is allowed on your network — like a firewall built into ZeroTier itself.',
        content: `# Flow Rules

## What Are Flow Rules?
Flow rules are ZeroTier's built-in **network-level firewall**. They let you control what traffic is allowed between members, acting like Access Control Lists (ACLs) applied to every packet.

## Why Use Them?
- Restrict which members can talk to each other
- Block specific ports or protocols
- Create segmented access (e.g., IoT devices can't access servers)
- Log or tag specific traffic types

## Basic Syntax
Flow rules use a simple language. The default rule is:

\`\`\`
accept;
\`\`\`

This allows all traffic. A more restrictive example:

\`\`\`
# Allow only specific traffic
drop                    # Default: drop everything
  not ethertype ipv4    # except IPv4
  and not ethertype arp # and ARP
  and not ethertype ipv6; # and IPv6
;

# Allow ICMP (ping)
accept ipprotocol 1;

# Allow SSH (port 22) 
accept ipprotocol 6 and dport 22;

# Allow HTTP/HTTPS
accept ipprotocol 6 and dport 80;
accept ipprotocol 6 and dport 443;

# Drop everything else
drop;
\`\`\`

## Common Rule Patterns

### Allow All (Default)
\`\`\`
accept;
\`\`\`

### Drop All Except ARP and IPv4
\`\`\`
drop not ethertype ipv4 and not ethertype arp;
accept;
\`\`\`

### Restrict by Tag
\`\`\`
tag servers
  id 1
  enum 0 no
  enum 1 yes
;
accept tand servers 1;
drop;
\`\`\`

## Capabilities
Capabilities are like tags that grant specific permissions:
\`\`\`
cap admin
  id 1
  accept;
;
\`\`\`
Members with the "admin" capability can bypass other rules.

## Important Notes
- Rules are processed **top to bottom** — first match wins
- **ARP must be allowed** for IPv4 to work
- Rules are enforced at both the sender and receiver
- Rules are **signed by the controller** and cannot be forged`,
        relatedArticles: ['authorization', 'encryption', 'tags-capabilities'],
    },
    {
        id: 'sso-oidc',
        title: 'SSO/OIDC Authentication',
        category: 'security',
        summary: 'Enterprise networks can require members to authenticate through your organization\'s identity provider (Okta, Azure AD, Keycloak, etc.).',
        content: `# SSO/OIDC Authentication

## What Is SSO for ZeroTier?
Single Sign-On (SSO) adds an extra **authentication layer** on top of ZeroTier's standard authorization. Members must log in with your organization's **identity provider** before gaining network access.

## How It Works
1. A member joins your network and is authorized
2. SSO is enabled on the network with your OIDC provider
3. The member must authenticate via your IdP (e.g., Okta, Azure AD)
4. Only after successful OIDC authentication can they access the network
5. Authentication can expire, requiring periodic re-authentication

## Supported Providers
Any OIDC-compliant provider works:
- **Okta**
- **Azure Active Directory**
- **Google Workspace**
- **Keycloak**
- **Auth0**
- Any standard OIDC provider

## Configuration
Set these in the network's SSO config:
- **Client ID**: From your OIDC provider
- **Issuer URL**: Your provider's OIDC endpoint
- **Authorization Endpoint**: Where users log in
- **Allow List**: Restrict to specific email domains or users

## SSO Exemption
Some members (like servers or IoT devices) can be marked as **SSO exempt**. They bypass the OIDC requirement while still needing standard authorization.

## Requirements
- **Paid ZeroTier plan** (Essential or Commercial)
- An OIDC-compliant identity provider
- Network must be private`,
        relatedArticles: ['authorization', 'encryption'],
    },
    {
        id: 'tags-capabilities',
        title: 'Tags and Capabilities',
        category: 'security',
        summary: 'Tags and capabilities allow fine-grained, role-based access control within your ZeroTier network using the rules engine.',
        content: `# Tags and Capabilities

## Tags
Tags are **key-value pairs** assigned to members that can be referenced in flow rules for policy-based access control.

### Example: Environment Tags
\`\`\`
tag environment
  id 1
  enum 0 production
  enum 1 staging
  enum 2 development
;

# Only allow same-environment communication
accept tor environment eq environment;
drop;
\`\`\`

### How to Use Tags
1. Define tags in your flow rules
2. Assign tag values to members via the API or UI
3. Reference tags in rules using \`tand\`, \`tor\`, \`teq\`, etc.

## Capabilities
Capabilities are **named permission sets** that grant members the ability to match specific rules.

### Example: Admin Capability
\`\`\`
cap admin
  id 1
  accept;  # Admins can access everything
;

cap webserver
  id 2
  accept dport 80 or dport 443;  # Only HTTP/HTTPS
;

# Default: drop everything
drop;
\`\`\`

### How to Use Capabilities
1. Define capabilities in your flow rules
2. Assign capability IDs to members
3. Members with a capability can send/receive traffic matching its rules

## Tags vs Capabilities
| Feature | Tags | Capabilities |
|---------|------|-------------|
| Purpose | Categorize members | Grant permissions |
| Type | Key-value pairs | Permission sets |
| In rules | Match conditions | Allow rules |
| Example | "team=engineering" | "can access SSH" |`,
        relatedArticles: ['flow-rules', 'authorization'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'ip-assignment',
        title: 'IP Address Assignment',
        category: 'configuration',
        summary: 'ZeroTier can automatically assign IP addresses from pools you define, or you can manually assign specific IPs to members.',
        content: `# IP Address Assignment

## How It Works
Each ZeroTier network needs IP addresses for its members. ZeroTier supports both automatic and manual assignment.

## Assignment Pools
An **IP assignment pool** defines a range of addresses that ZeroTier can automatically assign to new members.

### Example Pool
- **Start**: 10.0.0.1
- **End**: 10.0.0.254
- **Subnet**: This gives you 254 usable addresses

### Setting Up
1. Go to your network settings
2. Add an IP assignment pool (start and end range)
3. Add a matching **managed route** (e.g., 10.0.0.0/24)
4. New members will automatically get an IP from this pool

## Manual Assignment
You can also assign specific IPs to members:
- Useful for servers that need fixed addresses
- Set \`noAutoAssignIps: true\` on the member
- Manually specify IP addresses in \`ipAssignments\`

## IPv4 vs IPv6
ZeroTier supports three IPv6 modes:
- **6plane**: RFC-compliant /80 addresses derived from the network ID and node ID. Every node gets a unique /80 subnet.
- **RFC4193**: Unique local IPv6 addresses (fd00::/8 range)
- **ZT-assigned**: Manual IPv6 from your pool

## Common Subnet Choices
| Subnet | Addresses | Use Case |
|--------|-----------|----------|
| 10.0.0.0/24 | 254 | Small home/office network |
| 10.0.0.0/16 | 65,534 | Medium organization |
| 172.16.0.0/12 | 1,048,574 | Large deployment |
| 192.168.196.0/24 | 254 | Avoid conflicts with common LANs |

## Avoiding Conflicts
Choose a subnet that doesn't overlap with your local network. If your home network is 192.168.1.0/24, don't use that for ZeroTier — pick 10.x.x.x instead.`,
        relatedArticles: ['managed-routes', 'bridge-mode'],
    },
    {
        id: 'managed-routes',
        title: 'Managed Routes',
        category: 'configuration',
        summary: 'Managed routes tell your operating system how to reach the ZeroTier network and optionally route traffic to other subnets through bridge nodes.',
        content: `# Managed Routes

## What Are Managed Routes?
Managed routes are **routing table entries** that ZeroTier automatically adds to your operating system, telling it how to reach addresses on the virtual network.

## Basic Route (Required)
Every network needs at least one route matching its IP pool:
- **Target**: \`10.0.0.0/24\` (the subnet)
- **Via**: \`(null)\` — traffic goes directly over ZeroTier

This tells your OS: "To reach 10.0.0.x, use the ZeroTier interface."

## Gateway Routes (Advanced)
You can route traffic to other subnets **through a ZeroTier member**:
- **Target**: \`192.168.1.0/24\` (remote LAN)
- **Via**: \`10.0.0.1\` (a bridge node's ZeroTier IP)

This tells your OS: "To reach 192.168.1.x, send traffic to 10.0.0.1, which will forward it to that LAN."

## Default Route Override
Setting a route with target \`0.0.0.0/0\` routes ALL traffic through ZeroTier:
- Requires \`allowDefault: true\` on the client
- Used to create a full tunnel VPN
- **Be careful**: This can break your internet if misconfigured

## Route Permissions (Client-Side)
Members have three route permission flags:
- **allowManaged**: Accept managed routes (default: true)
- **allowGlobal**: Accept routes to public IP ranges (default: false)
- **allowDefault**: Accept default route override (default: false)

These are safety mechanisms — the network admin sets routes, but clients must opt-in to potentially dangerous ones.`,
        relatedArticles: ['ip-assignment', 'bridge-mode'],
    },
    {
        id: 'bridge-mode',
        title: 'Bridge Mode',
        category: 'configuration',
        summary: 'Bridge mode allows a ZeroTier member to forward Ethernet frames between the ZeroTier network and a physical network, connecting entire LANs.',
        content: `# Bridge Mode

## What Is Bridge Mode?
A member with **activeBridge: true** can forward Ethernet frames between the ZeroTier virtual network and a physical network interface. This effectively connects an entire LAN to your ZeroTier network.

## Use Cases
1. **Remote LAN access**: Access devices on a remote office's LAN through ZeroTier
2. **IoT bridge**: Connect non-ZeroTier devices (printers, cameras) to the virtual network
3. **Legacy systems**: Bridge in devices that can't run ZeroTier software

## How to Set Up
1. Enable **bridge mode** on the member that will act as the bridge
2. Add a **managed route** for the remote LAN through the bridge's ZeroTier IP
3. Configure the bridge machine to **forward packets** between interfaces
4. On Linux: \`echo 1 > /proc/sys/net/ipv4/ip_forward\`
5. Other machines on the remote LAN need a static route back to the bridge

## Important Considerations
- The bridge machine must be reliable (if it goes offline, the bridge is broken)
- Bridge traffic is NOT encrypted between the bridge and local LAN devices
- Performance depends on the bridge machine's network throughput
- Some traffic types (like multicast) may need special configuration`,
        relatedArticles: ['managed-routes', 'ip-assignment'],
    },
    {
        id: 'dns-config',
        title: 'DNS Configuration',
        category: 'configuration',
        summary: 'ZeroTier can push DNS settings to members, allowing name resolution within your virtual network.',
        content: `# DNS Configuration

## Network DNS Settings
Each ZeroTier network can specify:
- **Domain**: A domain suffix for the network (e.g., \`zt.example.com\`)
- **Servers**: DNS server IP addresses for resolution

## How It Works
1. Configure DNS domain and servers in the network settings
2. Members with \`allowDNS: true\` will have their system DNS updated
3. Members can resolve names within the ZeroTier network

## ZeroNSD
**ZeroNSD** is ZeroTier's companion DNS server that automatically creates DNS records for network members:
- Resolves \`<membername>.<domain>\` to the member's ZeroTier IP
- Uses member names from Central as hostnames
- Runs on a node in your network

## Use Cases
- Access devices by name instead of IP (\`myserver.zt.home\` instead of \`10.0.0.5\`)
- Split DNS: resolve internal names via ZeroTier DNS, everything else normally
- Service discovery within ZeroTier networks

## Client Settings
- **allowDNS**: Must be \`true\` for the client to accept DNS configuration
- This can be set when joining a network via the Service API`,
        relatedArticles: ['ip-assignment', 'managed-routes'],
    },
    {
        id: 'mtu-config',
        title: 'MTU (Maximum Transmission Unit)',
        category: 'configuration',
        summary: 'MTU controls the maximum packet size on your ZeroTier network. The default of 2800 allows for overhead without fragmentation.',
        content: `# MTU Configuration

## What Is MTU?
**MTU (Maximum Transmission Unit)** is the maximum size of a packet that can be sent over a network interface without being fragmented.

## ZeroTier's Default: 2800
ZeroTier sets a default MTU of **2800 bytes** for virtual network interfaces. This might seem high since Ethernet is typically 1500 bytes.

### Why 2800?
ZeroTier handles fragmentation internally. The virtual interface sees up to 2800-byte packets, but ZeroTier breaks them into smaller chunks that fit within the physical network's MTU before transmission. This is transparent to applications.

## When to Change MTU
- **Lower it** if you experience packet loss or connectivity issues behind certain VPNs
- **Lower to 1400** if running ZeroTier over another tunnel/VPN
- **Keep at 2800** in most cases — ZeroTier handles fragmentation efficiently

## Troubleshooting MTU Issues
If you suspect MTU problems:
1. Try pinging with large packets: \`ping -s 1400 -M do <zt-ip>\`
2. If large pings fail but small ones work, MTU may be too high
3. Reduce MTU in network settings until large pings succeed`,
        relatedArticles: ['direct-vs-relay'],
    },
    {
        id: 'multicast',
        title: 'Multicast and Broadcast',
        category: 'configuration',
        summary: 'ZeroTier supports Ethernet broadcast and multicast with configurable limits to prevent network flooding.',
        content: `# Multicast and Broadcast

## Broadcast
- **enableBroadcast**: When true, Ethernet broadcast frames (ff:ff:ff:ff:ff:ff) are allowed
- Required for protocols like ARP, DHCP, and NetBIOS
- Should almost always be enabled

## Multicast
ZeroTier supports Ethernet multicast with a **recipient limit** per group:
- **multicastLimit**: Maximum recipients per multicast group (default: 32)
- Prevents network flooding on large networks
- Increase for applications that need wide multicast (e.g., SSDP, mDNS)

## Why Limits?
On a physical LAN, multicast is limited by the physical network. On a virtual network spanning the internet, unrestricted multicast could overwhelm bandwidth. The limit prevents this.

## Common Multicast Uses on ZeroTier
- **ARP**: Required for IPv4 (encapsulated in multicast)
- **mDNS**: Service discovery (Bonjour, Avahi)
- **SSDP**: UPnP device discovery
- **VRRP**: Router redundancy protocols`,
        relatedArticles: ['bridge-mode', 'mtu-config'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // TROUBLESHOOTING
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'cannot-connect',
        title: 'Cannot Connect to Peers',
        category: 'troubleshooting',
        summary: 'Step-by-step guide for diagnosing and fixing peer connectivity issues.',
        content: `# Cannot Connect to Peers

## Quick Checklist
1. ✅ Is ZeroTier running? Check system tray icon or run \`zerotier-cli info\`
2. ✅ Are you joined to the network? Run \`zerotier-cli listnetworks\`
3. ✅ Is your node authorized? Check the Central member list
4. ✅ Is the other peer online? Check their status in Central
5. ✅ Is your firewall allowing ZeroTier? Check for port 9993 access
6. ✅ Can you ping the other peer? \`ping <zt-ip>\`

## Detailed Troubleshooting

### Step 1: Check Service Status
\`\`\`bash
zerotier-cli info
# Should show: 200 info <node-id> <version> ONLINE
\`\`\`
If it shows "OFFLINE", ZeroTier can't reach the internet.

### Step 2: Check Network Status
\`\`\`bash
zerotier-cli listnetworks
# Should show network with "OK" status
\`\`\`
Status meanings:
- **OK**: Connected and authorized
- **ACCESS_DENIED**: Not authorized — ask network admin
- **NOT_FOUND**: Network ID doesn't exist
- **PORT_ERROR**: Interface creation problem (restart may help)

### Step 3: Check Peer Connections
\`\`\`bash
zerotier-cli peers
# Shows connection type for each peer
\`\`\`
- **DIRECT**: Good — peer-to-peer connection
- **RELAY**: Traffic going through root servers (higher latency)
- If peer isn't listed, they may be offline

### Step 4: Check Firewall
- Ensure UDP port 9993 is allowed outbound
- Temporarily disable firewall to test
- On macOS, check System Preferences > Security & Privacy > Firewall

### Step 5: Nuclear Options
If nothing works:
1. Leave and rejoin the network
2. Stop ZeroTier, delete the \`peers.d\` folder, restart
3. As a last resort, reset your node identity (requires re-authorization everywhere)`,
        relatedArticles: ['direct-vs-relay', 'nat-types', 'service-restart'],
    },
    {
        id: 'service-restart',
        title: 'Restarting ZeroTier Service',
        category: 'troubleshooting',
        summary: 'How to restart the ZeroTier service on different operating systems to resolve common issues.',
        content: `# Restarting ZeroTier Service

Many issues can be resolved by restarting the ZeroTier service.

## macOS
\`\`\`bash
# Stop
sudo launchctl unload /Library/LaunchDaemons/com.zerotier.one.plist

# Start
sudo launchctl load /Library/LaunchDaemons/com.zerotier.one.plist
\`\`\`

Or use the menu bar icon > "Quit" and reopen the app.

## Linux (systemd)
\`\`\`bash
sudo systemctl restart zerotier-one
\`\`\`

## Windows
\`\`\`
# PowerShell (admin)
Restart-Service ZeroTierOneService
\`\`\`
Or use Services (services.msc) > ZeroTier One > Restart.

## Clearing Peer Cache
If restarting alone doesn't help, try clearing the peer cache:
1. **Stop** ZeroTier (commands above)
2. **Delete** the \`peers.d\` directory:
   - macOS: \`~/Library/Application Support/ZeroTier/One/peers.d/\`
   - Linux: \`/var/lib/zerotier-one/peers.d/\`
   - Windows: \`C:\\ProgramData\\ZeroTier\\One\\peers.d\\\`
3. **Start** ZeroTier again

This forces ZeroTier to re-discover all peers, which can fix stale connection issues.`,
        relatedArticles: ['cannot-connect', 'direct-vs-relay'],
    },
    {
        id: 'high-latency',
        title: 'Diagnosing High Latency',
        category: 'troubleshooting',
        summary: 'How to identify and fix high latency issues on ZeroTier networks.',
        content: `# Diagnosing High Latency

## Understanding Latency
**Latency** is the round-trip time for a packet to travel to a peer and back. Lower is better.

| Latency | Quality | Typical Scenario |
|---------|---------|-----------------|
| < 30ms | Excellent | Same city, direct connection |
| 30-100ms | Good | Different cities/countries, direct |
| 100-250ms | Acceptable | Intercontinental, may be relayed |
| > 250ms | Poor | Likely relayed or very distant |

## Common Causes

### 1. Relayed Connection (Most Common)
Check if the peer shows as "RELAY" in \`zerotier-cli peers\`. If so:
- Open UDP port 9993 on both firewalls
- Check for symmetric NAT (see NAT Types article)
- Consider deploying a Moon server

### 2. Geographic Distance
Even with direct connections, packets have a physical travel time:
- New York → London: ~70ms minimum
- US → Australia: ~150ms minimum
- Nothing can be done about the speed of light!

### 3. ISP Routing
Sometimes ISPs route traffic inefficiently:
- Try a different network (mobile hotspot) to test
- Use traceroute to identify routing issues
- A Moon server can sometimes provide a better path

### 4. Network Congestion
- Test at different times of day
- Check if your local network is congested (speed test)
- QoS (Quality of Service) settings on your router may help`,
        relatedArticles: ['direct-vs-relay', 'moon-servers', 'cannot-connect'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // ARCHITECTURE
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'vl1-vl2',
        title: 'VL1 and VL2 Layers',
        category: 'architecture',
        summary: 'ZeroTier operates in two layers: VL1 (peer-to-peer transport) and VL2 (virtual Ethernet), creating a clean separation of concerns.',
        content: `# VL1 and VL2 Architecture

ZeroTier's architecture is cleanly separated into two layers:

## VL1 — Peer-to-Peer Transport Layer
The **Virtual Layer 1** handles:
- **Node discovery**: Finding other ZeroTier nodes on the internet
- **NAT traversal**: UDP hole punching and relay fallback
- **Encryption**: End-to-end encryption of all traffic
- **Path selection**: Choosing the best route between peers

VL1 is like the "cable" that connects all ZeroTier nodes. It manages the physical connectivity over the internet.

## VL2 — Virtual Ethernet Layer
The **Virtual Layer 2** provides:
- **Virtual network interfaces**: Creating tap/tun devices on your OS
- **Ethernet emulation**: Sending Ethernet frames between nodes
- **Network configuration**: IP addresses, routes, DNS, rules
- **Access control**: Authorization, flow rules, capabilities

VL2 is like the "switch" in a traditional network. It handles everything that happens on the virtual network.

## Why This Separation Matters
- VL1 can work on any internet connection (UDP, TCP fallback)
- VL2 doesn't need to know HOW peers are connected, just that they are
- New features can be added to either layer independently
- Controllers only manage VL2 — they don't handle transport`,
        relatedArticles: ['what-is-zerotier', 'root-servers', 'encryption'],
    },
    {
        id: 'controllers',
        title: 'Network Controllers',
        category: 'architecture',
        summary: 'Controllers manage the rules and membership of ZeroTier networks. You can use ZeroTier Central (hosted) or run your own.',
        content: `# Network Controllers

## What Is a Controller?
A **network controller** is the authority for a ZeroTier network. It decides:
- Who is authorized to join
- What IP addresses members get
- What routes, rules, and DNS to push
- What capabilities and tags members have

## Hosted Controllers (ZeroTier Central)
Most users use ZeroTier's hosted controller at **my.zerotier.com**:
- No setup required
- Web UI for management
- REST API for automation
- Free tier: up to 25 members per network

## Self-Hosted Controllers
Every ZeroTier node includes a controller — you can run your own:
- Full control over your network infrastructure
- Networks are identified by your node ID (first 10 chars of network ID)
- Managed via the **Service API** controller endpoints
- No dependency on ZeroTier's cloud services

## Controller Architecture
- Controllers are **eventually consistent** — member configs may take a few seconds to propagate
- Controllers don't relay traffic — they only manage the control plane
- If the controller goes offline, existing members continue working (they cache their config)
- New joins and config changes require the controller to be online

## Planning for Reliability
- The controller is a **single point of failure** for configuration changes
- Use ZeroTier Central for hosted reliability (SLA-backed)
- For self-hosted: ensure the controller machine has good uptime
- Consider backup/restore of controller state`,
        relatedArticles: ['central-vs-service', 'what-is-zerotier', 'authorization'],
    },
    {
        id: 'peer-roles',
        title: 'Peer Roles (LEAF, PLANET, MOON)',
        category: 'architecture',
        summary: 'Every peer in ZeroTier has a role: LEAF (regular nodes), PLANET (root servers), or MOON (custom root servers).',
        content: `# Peer Roles

When you view peers (\`zerotier-cli peers\`), each peer has a role:

## LEAF 🌿
- **Regular nodes** — other ZeroTier clients you're connected to
- These are your actual network members (servers, desktops, phones)
- Traffic to LEAF peers is your actual network traffic
- Should ideally be DIRECT, not relayed

## PLANET 🌍
- **ZeroTier root servers** — operated by ZeroTier, Inc.
- Used for peer discovery and relay
- You're always connected to at least one PLANET
- Typically see 2-4 PLANET peers at all times
- High availability, globally distributed

## MOON 🌙
- **Custom root servers** — operated by you
- Same function as PLANET but under your control
- Must be explicitly configured (orbit command)
- Useful for improving connectivity in specific regions

## What to Watch For
- **LEAF peers with high latency**: May need direct connection troubleshooting
- **PLANET peers with high latency**: Could indicate internet connectivity issues
- **No PLANET peers**: ZeroTier can't reach its infrastructure — check internet/firewall
- **MOON peers offline**: Your custom relay is down`,
        relatedArticles: ['root-servers', 'moon-servers', 'direct-vs-relay'],
    },

    // ═══════════════════════════════════════════════════════════════════
    // ADVANCED
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'bonding',
        title: 'Link Bonding',
        category: 'advanced',
        summary: 'Link bonding aggregates multiple physical network connections for redundancy and improved throughput between ZeroTier peers.',
        content: `# Link Bonding

## What Is Bonding?
**Link bonding** allows a ZeroTier node to aggregate multiple physical network connections to a peer. If you have both ethernet and WiFi, bonding uses both for better reliability.

## How It Works
- When bonded, ZeroTier can send traffic over multiple physical paths simultaneously
- If one path fails, traffic seamlessly fails over to the remaining path(s)
- Can improve throughput by using multiple connections in parallel

## The isBonded Field
In peer information, the \`isBonded\` field shows if bonding is active for that peer connection.

## When Is It Useful?
- Servers with redundant network interfaces
- Critical links where failover is essential
- High-bandwidth applications that benefit from aggregate throughput

## Configuration
Bonding is configured in ZeroTier's local configuration file (\`local.conf\`), not through the API. It requires defining bonding policies for specific peers.`,
        relatedArticles: ['direct-vs-relay', 'peer-roles'],
    },
    {
        id: 'tcp-fallback',
        title: 'TCP Fallback Relay',
        category: 'advanced',
        summary: 'When UDP is completely blocked, ZeroTier can tunnel through TCP/HTTPS as a last resort, with reduced performance.',
        content: `# TCP Fallback Relay

## What Is TCP Fallback?
When **all UDP traffic is blocked** (e.g., restrictive corporate firewalls), ZeroTier can tunnel its traffic through **TCP port 443 (HTTPS)**. This is a last-resort fallback.

## How to Detect
- \`tcpFallbackActive: true\` in node status
- Connection quality will be noticeably lower
- This dashboard highlights it with a warning

## Why It's Slower
ZeroTier is designed for UDP, which is faster than TCP:
- **No head-of-line blocking**: UDP packets are independent
- **Lower overhead**: UDP has smaller headers
- **No congestion control**: ZeroTier manages its own flow
- TCP adds all of these, plus potential retransmission delays

## How to Fix
1. **Open UDP port 9993 outbound** — this is the #1 solution
2. Talk to your network admin about allowing UDP 9993
3. If on a personal network, check router firewall settings
4. The \`allowTcpFallbackRelay\` setting can be disabled if you prefer no connection over a slow one

## Settings
- \`allowTcpFallbackRelay\`: Enable/disable TCP fallback (default: true)
- \`portMappingEnabled\`: Enable UPnP/NAT-PMP for automatic port forwarding`,
        relatedArticles: ['direct-vs-relay', 'cannot-connect'],
    },
    {
        id: 'organizations',
        title: 'Organizations',
        category: 'advanced',
        summary: 'Organizations in ZeroTier Central allow teams to share network management, with invitations and role-based access.',
        content: `# Organizations

## What Are Organizations?
ZeroTier Central supports **organizations** for team-based network management:
- Multiple users can manage the same networks
- Billing is at the organization level
- Members can have different permission levels

## Organization Features
- **Shared networks**: All org members can see and manage networks
- **Invitations**: Invite users by email to join your org
- **Billing**: Unified billing for the organization
- **SSO**: Organization-wide OIDC/SSO configuration

## Managing Invitations
- **Send**: Invite users by email via the API or UI
- **Accept**: Invited users can accept to join your org
- **Decline**: Users can decline invitations
- **Revoke**: Admins can cancel pending invitations

## API Operations
- Get organization details
- List organization members
- List, send, and manage invitations
- Configure organization-wide settings`,
        relatedArticles: ['sso-oidc', 'central-vs-service'],
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────

export function getArticleById(id: string): KnowledgeArticle | undefined {
    return knowledgeBase.find(a => a.id === id);
}

export function getArticlesByCategory(category: KnowledgeCategory): KnowledgeArticle[] {
    return knowledgeBase.filter(a => a.category === category);
}

export function searchArticles(query: string): KnowledgeArticle[] {
    const q = query.toLowerCase();
    return knowledgeBase.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
}

export function getAllCategories(): { category: KnowledgeCategory; count: number }[] {
    const counts = new Map<KnowledgeCategory, number>();
    for (const article of knowledgeBase) {
        counts.set(article.category, (counts.get(article.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}

export const categoryLabels: Record<KnowledgeCategory, string> = {
    fundamentals: '📘 Fundamentals',
    networking: '🌐 Networking',
    security: '🔒 Security',
    troubleshooting: '🔧 Troubleshooting',
    configuration: '⚙️ Configuration',
    architecture: '🏗️ Architecture',
    advanced: '🚀 Advanced',
};

export const categoryDescriptions: Record<KnowledgeCategory, string> = {
    fundamentals: 'Core concepts every ZeroTier user should understand',
    networking: 'How ZeroTier connects devices across the internet',
    security: 'Encryption, authorization, and access control',
    troubleshooting: 'Diagnosing and fixing common problems',
    configuration: 'Setting up IP addresses, routes, DNS, and more',
    architecture: 'How ZeroTier is built under the hood',
    advanced: 'Power-user features and deep-dive topics',
};
