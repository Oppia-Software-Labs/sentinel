use soroban_sdk::{contracttype, Address, String, Symbol, Vec};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Policy(Address),
    Consensus(Address),
    AgentList(Address),
    Agent(Address, Symbol),
    SpendTracker(Address),
    Verdict(Symbol),
    VerdictCounter,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PolicyRules {
    pub max_per_task: i128,
    pub max_per_hour: i128,
    pub max_per_day: i128,
    pub blocked_vendors: Vec<Symbol>,
    pub alert_threshold: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AgentInfo {
    pub agent_type: Symbol,
    pub endpoint: String,
    pub description: String,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ConsensusData {
    pub quorum: Symbol,
    pub timeout_ms: u32,
    pub agent_ids: Vec<Symbol>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SpendingTracker {
    pub hour_total: i128,
    pub hour_start: u64,
    pub day_total: i128,
    pub day_start: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct IntentData {
    pub agent_id: Symbol,
    pub amount: i128,
    pub asset_code: Symbol,
    pub vendor: Symbol,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoteData {
    pub agent_id: Symbol,
    pub decision: Symbol,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VerdictRecord {
    pub tx_id: Symbol,
    pub owner: Address,
    pub decision: Symbol,
    pub consensus_result: Symbol,
    pub policy_decision: Symbol,
    pub amount: i128,
    pub vendor: Symbol,
    pub timestamp: u64,
}
