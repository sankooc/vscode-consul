// import { ConsulProvider, KVTreeItem } from "./providers/consulProvider";

export const log = function(...args: any){
    console.log(...args);
};


export interface ConsulNode {
    ID: string;
    Node: string;
    Address: string;
    Datacenter?: string;
    TaggedAddresses?: {
        lan: string;
        lan_ipv4: string;
        wan: string;
        wan_ipv4: string;
    };
    Meta?: {
        'consul-network-segment': string;
        'consul-version': string;
    };
    CreateIndex?: number;
    ModifyIndex?: number;
}

export interface ConsulService {
    ID: string;
    Service: string;
    Tags?: string[];
    Address?: string;
    Meta?: {
        grpc_tls_port: string;
        non_voter: string;
        raft_version: string;
        read_replica: string;
        serf_protocol_current: string;
        serf_protocol_max: string;
        serf_protocol_min: string;
        version: string;
    };
    Port: number;
    Weights?: { Passing: number; Warning: number };
    EnableTagOverride?: boolean;
    Proxy?: {
        Mode: string;
        MeshGateway: {};
        Expose: {};
    };
    Connect?: {};
    PeerName?: string;
    CreateIndex?: number;
    ModifyIndex?: number;
}