// ZeroTier Network Diagnostics Engine
// Detects common connectivity, security, and configuration issues

import * as central from './central-api';
import * as service from './service-api';

// ─── Types ───────────────────────────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'info';
export type Category = 'connectivity' | 'performance' | 'security' | 'configuration';

export interface DiagnosticIssue {
    id: string;
    severity: Severity;
    category: Category;
    title: string;
    description: string;
    recommendation: string;
    affectedNode?: string;
    affectedNetwork?: string;
}

export interface DiagnosticReport {
    timestamp: number;
    nodeStatus: service.ServiceStatus | null;
    issues: DiagnosticIssue[];
    summary: {
        critical: number;
        warning: number;
        info: number;
        totalPeers: number;
        relayedPeers: number;
        directPeers: number;
        avgLatency: number;
    };
}

// ─── Diagnostics ─────────────────────────────────────────────────────

export async function runDiagnostics(centralToken?: string): Promise<DiagnosticReport> {
    const issues: DiagnosticIssue[] = [];
    let nodeStatus: service.ServiceStatus | null = null;
    let peers: service.ServicePeer[] = [];
    let networks: central.ZTNetwork[] = [];

    // 1. Check local node status
    try {
        nodeStatus = await service.getServiceStatus();

        if (!nodeStatus.online) {
            issues.push({
                id: 'node-offline',
                severity: 'critical',
                category: 'connectivity',
                title: 'Local Node Offline',
                description: 'The local ZeroTier node reports as offline. It cannot communicate with any peers.',
                recommendation: 'Check your internet connection and restart the ZeroTier service. On macOS: sudo launchctl unload /Library/LaunchDaemons/com.zerotier.one.plist && sudo launchctl load /Library/LaunchDaemons/com.zerotier.one.plist',
            });
        }

        if (nodeStatus.tcpFallbackActive) {
            issues.push({
                id: 'tcp-fallback',
                severity: 'warning',
                category: 'connectivity',
                title: 'TCP Fallback Active',
                description: 'The node is using TCP fallback relay. This means UDP traffic on port 9993 is likely blocked by your firewall or ISP.',
                recommendation: 'Ensure UDP port 9993 is open outbound in your firewall. If behind a corporate firewall, contact your network admin.',
            });
        }

        if (!nodeStatus.config.settings.portMappingEnabled) {
            issues.push({
                id: 'port-mapping-disabled',
                severity: 'info',
                category: 'configuration',
                title: 'Port Mapping Disabled',
                description: 'UPnP/NAT-PMP port mapping is disabled. This may prevent direct connections through NAT.',
                recommendation: 'Enable port mapping in ZeroTier settings to improve direct connectivity through NAT routers.',
            });
        }
    } catch (err) {
        issues.push({
            id: 'service-unreachable',
            severity: 'critical',
            category: 'connectivity',
            title: 'ZeroTier Service Unreachable',
            description: `Cannot connect to the local ZeroTier service on port 9993. Error: ${err instanceof Error ? err.message : String(err)}`,
            recommendation: 'Make sure ZeroTier is installed and running. On macOS, check System Preferences > ZeroTier or run: sudo launchctl load /Library/LaunchDaemons/com.zerotier.one.plist',
        });
    }

    // 2. Check peers
    try {
        peers = await service.getPeers();

        for (const peer of peers) {
            if (peer.role === 'LEAF') {
                const hasDirectPath = peer.paths.some(p => p.active && !p.expired);

                if (!hasDirectPath) {
                    issues.push({
                        id: `peer-relayed-${peer.address}`,
                        severity: 'warning',
                        category: 'connectivity',
                        title: `Peer ${peer.address} is Relayed`,
                        description: `No direct path to peer ${peer.address}. Traffic is being relayed through root servers, causing higher latency.`,
                        recommendation: 'Check firewall settings on both sides. Ensure UDP port 9993 is open. If behind symmetric NAT, consider setting up a Moon server.',
                        affectedNode: peer.address,
                    });
                }

                if (peer.latency > 250) {
                    issues.push({
                        id: `peer-high-latency-${peer.address}`,
                        severity: 'warning',
                        category: 'performance',
                        title: `High Latency to ${peer.address}`,
                        description: `Latency to peer ${peer.address} is ${peer.latency}ms, which may cause poor performance.`,
                        recommendation: 'High latency is often caused by relayed connections. Check if a direct path can be established. Consider deploying a Moon server closer to remote peers.',
                        affectedNode: peer.address,
                    });
                } else if (peer.latency > 100) {
                    issues.push({
                        id: `peer-elevated-latency-${peer.address}`,
                        severity: 'info',
                        category: 'performance',
                        title: `Elevated Latency to ${peer.address}`,
                        description: `Latency to peer ${peer.address} is ${peer.latency}ms.`,
                        recommendation: 'This is within acceptable range for most applications but may affect real-time operations.',
                        affectedNode: peer.address,
                    });
                }

                // Check for stale peers (paths with no recent activity)
                const stalePaths = peer.paths.filter(p => {
                    const now = Date.now();
                    return p.active && (now - p.lastReceive > 120000); // 2 minutes
                });
                if (stalePaths.length > 0 && peer.paths.length === stalePaths.length) {
                    issues.push({
                        id: `peer-stale-${peer.address}`,
                        severity: 'warning',
                        category: 'connectivity',
                        title: `Stale Connection to ${peer.address}`,
                        description: `All paths to peer ${peer.address} show no recent traffic. The connection may be going stale.`,
                        recommendation: 'The peer may be offline or experiencing network issues. Try pinging the peer to refresh the connection.',
                        affectedNode: peer.address,
                    });
                }

                // Check for old client versions
                if (peer.versionMajor > 0 && peer.versionMajor < 1) {
                    issues.push({
                        id: `peer-old-version-${peer.address}`,
                        severity: 'info',
                        category: 'security',
                        title: `Outdated Client: ${peer.address}`,
                        description: `Peer ${peer.address} is running ZeroTier ${peer.version}, which may be outdated.`,
                        recommendation: 'Consider updating the ZeroTier client on this node for latest security patches and features.',
                        affectedNode: peer.address,
                    });
                }
            }
        }
    } catch {
        // Service may be unreachable — already reported above
    }

    // 3. Check Central API networks (if token available)
    if (centralToken) {
        try {
            networks = await central.listNetworks(centralToken);

            for (const network of networks) {
                // Check for unauthorized members
                try {
                    const members = await central.listMembers(centralToken, network.id);
                    const unauthorized = members.filter(m => !m.config.authorized);

                    if (unauthorized.length > 0) {
                        issues.push({
                            id: `unauthorized-members-${network.id}`,
                            severity: 'warning',
                            category: 'security',
                            title: `${unauthorized.length} Unauthorized Member(s) on ${network.config.name || network.id}`,
                            description: `There are ${unauthorized.length} members awaiting authorization on network "${network.config.name}".`,
                            recommendation: 'Review and authorize or remove these members in the Members page.',
                            affectedNetwork: network.id,
                        });
                    }

                    // Offline member detection
                    const now = Date.now();
                    const offlineThreshold = 24 * 60 * 60 * 1000; // 24 hours
                    const longOffline = members.filter(
                        m => m.config.authorized && m.lastOnline > 0 && (now - m.lastOnline) > offlineThreshold
                    );
                    if (longOffline.length > 0) {
                        issues.push({
                            id: `offline-members-${network.id}`,
                            severity: 'info',
                            category: 'connectivity',
                            title: `${longOffline.length} Member(s) Offline >24h on ${network.config.name || network.id}`,
                            description: `${longOffline.length} authorized members on "${network.config.name}" have been offline for more than 24 hours.`,
                            recommendation: 'Check if these members should still be on the network. They may need ZeroTier restarted on their machines.',
                            affectedNetwork: network.id,
                        });
                    }

                    // IP conflict detection
                    const ipMap = new Map<string, string[]>();
                    for (const member of members) {
                        for (const ip of member.config.ipAssignments) {
                            const existing = ipMap.get(ip) || [];
                            existing.push(member.nodeId);
                            ipMap.set(ip, existing);
                        }
                    }
                    for (const [ip, nodes] of ipMap) {
                        if (nodes.length > 1) {
                            issues.push({
                                id: `ip-conflict-${network.id}-${ip}`,
                                severity: 'critical',
                                category: 'configuration',
                                title: `IP Conflict on ${network.config.name || network.id}`,
                                description: `IP address ${ip} is assigned to multiple members: ${nodes.join(', ')}`,
                                recommendation: 'Reassign IP addresses to ensure each member has a unique IP. This can cause intermittent connectivity issues.',
                                affectedNetwork: network.id,
                            });
                        }
                    }

                    // Version mismatch detection
                    const versions = new Map<string, number>();
                    for (const member of members.filter(m => m.clientVersion)) {
                        versions.set(member.clientVersion, (versions.get(member.clientVersion) || 0) + 1);
                    }
                    if (versions.size > 2) {
                        const versionList = Array.from(versions.entries())
                            .map(([v, c]) => `${v} (${c} nodes)`)
                            .join(', ');
                        issues.push({
                            id: `version-mismatch-${network.id}`,
                            severity: 'info',
                            category: 'security',
                            title: `Multiple Client Versions on ${network.config.name || network.id}`,
                            description: `Detected ${versions.size} different client versions: ${versionList}`,
                            recommendation: 'Consider standardizing client versions across your network for consistent behavior and security.',
                            affectedNetwork: network.id,
                        });
                    }

                    // Bridge mode detection
                    const bridges = members.filter(m => m.config.activeBridge);
                    if (bridges.length > 0) {
                        issues.push({
                            id: `bridges-${network.id}`,
                            severity: 'info',
                            category: 'configuration',
                            title: `${bridges.length} Active Bridge(s) on ${network.config.name || network.id}`,
                            description: `Members with bridge mode enabled: ${bridges.map(b => b.name || b.nodeId).join(', ')}`,
                            recommendation: 'Bridges relay Ethernet frames between ZeroTier and physical networks. Ensure this is intentional and correctly configured.',
                            affectedNetwork: network.id,
                        });
                    }
                } catch {
                    // Member fetch may fail for some networks
                }

                // Public network warning
                if (!network.config.private) {
                    issues.push({
                        id: `public-network-${network.id}`,
                        severity: 'warning',
                        category: 'security',
                        title: `Network "${network.config.name}" is Public`,
                        description: 'Anyone with the network ID can join this network without authorization.',
                        recommendation: 'Consider making this network private to require explicit authorization for new members.',
                        affectedNetwork: network.id,
                    });
                }

                // No routes warning
                if (!network.config.routes || network.config.routes.length === 0) {
                    issues.push({
                        id: `no-routes-${network.id}`,
                        severity: 'warning',
                        category: 'configuration',
                        title: `No Routes on "${network.config.name}"`,
                        description: 'This network has no managed routes configured. Traffic may not be routable.',
                        recommendation: 'Add at least one managed route matching your IP assignment pool (e.g., 10.0.0.0/24).',
                        affectedNetwork: network.id,
                    });
                }

                // No IP pools warning
                if (!network.config.ipAssignmentPools || network.config.ipAssignmentPools.length === 0) {
                    issues.push({
                        id: `no-ip-pools-${network.id}`,
                        severity: 'warning',
                        category: 'configuration',
                        title: `No IP Assignment Pools on "${network.config.name}"`,
                        description: 'This network has no IP assignment pools. Members will not receive automatic IP assignments.',
                        recommendation: 'Add an IP assignment pool (e.g., 10.0.0.1 to 10.0.0.254) for automatic IP assignment.',
                        affectedNetwork: network.id,
                    });
                }
            }
        } catch {
            issues.push({
                id: 'central-api-error',
                severity: 'warning',
                category: 'connectivity',
                title: 'Central API Unreachable',
                description: 'Cannot connect to ZeroTier Central API. Network-level diagnostics are unavailable.',
                recommendation: 'Check your Central API token in Settings and ensure internet connectivity.',
            });
        }
    }

    // 4. Compute summary
    const leafPeers = peers.filter(p => p.role === 'LEAF');
    const relayedPeers = leafPeers.filter(p => !p.paths.some(path => path.active && !path.expired));
    const directPeers = leafPeers.length - relayedPeers.length;
    const avgLatency = leafPeers.length > 0
        ? Math.round(leafPeers.reduce((sum, p) => sum + p.latency, 0) / leafPeers.length)
        : 0;

    return {
        timestamp: Date.now(),
        nodeStatus,
        issues,
        summary: {
            critical: issues.filter(i => i.severity === 'critical').length,
            warning: issues.filter(i => i.severity === 'warning').length,
            info: issues.filter(i => i.severity === 'info').length,
            totalPeers: leafPeers.length,
            relayedPeers: relayedPeers.length,
            directPeers,
            avgLatency,
        },
    };
}
