#![no_std]

mod errors;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, contractevent, symbol_short, Address, Env, Symbol, Vec};

use crate::errors::ContractError;
use crate::types::{
    AgentInfo, ConsensusData, DataKey, IntentData, PolicyRules, SpendingTracker, VerdictRecord,
    VoteData,
};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerdictEmitted {
    #[topic]
    pub tx_id: Symbol,
    #[topic]
    pub owner: Address,
    pub decision: Symbol,
    pub consensus_result: Symbol,
    pub policy_decision: Symbol,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteRecorded {
    #[topic]
    pub tx_id: Symbol,
    #[topic]
    pub agent_id: Symbol,
    pub decision: Symbol,
}

const APPROVE: Symbol = symbol_short!("approve");
const REJECT: Symbol = symbol_short!("reject");
const MAJORITY: Symbol = symbol_short!("majority");
const UNANIMOU: Symbol = symbol_short!("unanimou");
const ANY: Symbol = symbol_short!("any");

const HOUR_SECS: u64 = 3600;
const DAY_SECS: u64 = 86400;

const TTL_THRESHOLD: u32 = 17_280;
const TTL_EXTEND: u32 = 518_400;

#[contract]
pub struct SentinelGovernance;

#[contractimpl]
impl SentinelGovernance {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    // ── Policy management ──────────────────────────────────────────────

    pub fn set_policy(env: Env, owner: Address, rules: PolicyRules) {
        owner.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Policy(owner.clone()), &rules);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Policy(owner), TTL_THRESHOLD, TTL_EXTEND);
    }

    pub fn get_policy(env: Env, owner: Address) -> PolicyRules {
        env.storage()
            .persistent()
            .get(&DataKey::Policy(owner))
            .unwrap_or(PolicyRules {
                max_per_task: i128::MAX,
                max_per_hour: i128::MAX,
                max_per_day: i128::MAX,
                blocked_vendors: Vec::new(&env),
                alert_threshold: i128::MAX,
            })
    }

    // ── Agent registry ─────────────────────────────────────────────────

    pub fn register_agent(
        env: Env,
        owner: Address,
        agent_id: Symbol,
        info: AgentInfo,
    ) -> Result<(), ContractError> {
        owner.require_auth();

        let key = DataKey::Agent(owner.clone(), agent_id.clone());
        if env.storage().persistent().has(&key) {
            let existing: AgentInfo = env.storage().persistent().get(&key).unwrap();
            if existing.is_active {
                return Err(ContractError::AgentAlreadyExists);
            }
        }

        env.storage().persistent().set(&key, &info);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);

        let list_key = DataKey::AgentList(owner.clone());
        let mut list: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));

        let mut found = false;
        for i in 0..list.len() {
            if list.get(i).unwrap() == agent_id {
                found = true;
                break;
            }
        }
        if !found {
            list.push_back(agent_id);
        }

        env.storage().persistent().set(&list_key, &list);
        env.storage()
            .persistent()
            .extend_ttl(&list_key, TTL_THRESHOLD, TTL_EXTEND);

        Ok(())
    }

    pub fn remove_agent(env: Env, owner: Address, agent_id: Symbol) -> Result<(), ContractError> {
        owner.require_auth();

        let key = DataKey::Agent(owner.clone(), agent_id.clone());
        let mut info: AgentInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::AgentNotRegistered)?;

        info.is_active = false;
        env.storage().persistent().set(&key, &info);

        Ok(())
    }

    pub fn get_agents(env: Env, owner: Address) -> Vec<AgentInfo> {
        let list_key = DataKey::AgentList(owner.clone());
        let ids: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));

        let mut result = Vec::new(&env);
        for i in 0..ids.len() {
            let aid = ids.get(i).unwrap();
            let key = DataKey::Agent(owner.clone(), aid);
            if let Some(info) = env.storage().persistent().get::<DataKey, AgentInfo>(&key) {
                if info.is_active {
                    result.push_back(info);
                }
            }
        }
        result
    }

    // ── Consensus config ───────────────────────────────────────────────

    pub fn set_consensus(env: Env, owner: Address, config: ConsensusData) {
        owner.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Consensus(owner.clone()), &config);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Consensus(owner), TTL_THRESHOLD, TTL_EXTEND);
    }

    pub fn get_consensus(env: Env, owner: Address) -> Result<ConsensusData, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Consensus(owner))
            .ok_or(ContractError::ConsensusNotConfigured)
    }

    // ── Governance evaluation (on-chain) ───────────────────────────────

    pub fn evaluate(
        env: Env,
        owner: Address,
        intent: IntentData,
        votes: Vec<VoteData>,
    ) -> Result<VerdictRecord, ContractError> {
        owner.require_auth();

        if votes.is_empty() {
            return Err(ContractError::NoVotesProvided);
        }

        // 1. Validate votes come from registered active agents
        let list_key = DataKey::AgentList(owner.clone());
        let registered_ids: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or(Vec::new(&env));

        for i in 0..votes.len() {
            let vote = votes.get(i).unwrap();
            let agent_key = DataKey::Agent(owner.clone(), vote.agent_id.clone());
            let agent_info: AgentInfo = env
                .storage()
                .persistent()
                .get(&agent_key)
                .ok_or(ContractError::InvalidVoteAgent)?;
            if !agent_info.is_active {
                return Err(ContractError::InvalidVoteAgent);
            }
            let mut found = false;
            for j in 0..registered_ids.len() {
                if registered_ids.get(j).unwrap() == vote.agent_id {
                    found = true;
                    break;
                }
            }
            if !found {
                return Err(ContractError::InvalidVoteAgent);
            }
        }

        // 2. Evaluate quorum
        let consensus_config = Self::get_consensus(env.clone(), owner.clone())?;

        let mut approve_count: u32 = 0;
        let total_votes = votes.len();
        for i in 0..total_votes {
            let vote = votes.get(i).unwrap();
            if vote.decision == APPROVE {
                approve_count += 1;
            }
        }

        let quorum_passed = if consensus_config.quorum == MAJORITY {
            approve_count > (total_votes / 2)
        } else if consensus_config.quorum == UNANIMOU {
            approve_count == total_votes
        } else if consensus_config.quorum == ANY {
            approve_count > 0
        } else {
            approve_count > (total_votes / 2)
        };

        let consensus_result = if quorum_passed {
            APPROVE.clone()
        } else {
            REJECT.clone()
        };

        // 3. Evaluate policy
        let policy_result =
            Self::check_policy_internal(&env, &owner, intent.amount, &intent.vendor);

        let policy_decision = if policy_result.is_ok() {
            APPROVE.clone()
        } else {
            REJECT.clone()
        };

        // 4. Final verdict: approve only if both consensus AND policy approve
        let decision = if quorum_passed && policy_result.is_ok() {
            APPROVE.clone()
        } else {
            REJECT.clone()
        };

        // 5. Update spend tracker only if approved
        if decision == APPROVE {
            Self::update_spend_tracker(&env, &owner, intent.amount);
        }

        // 6. Generate tx_id and store verdict
        let timestamp = env.ledger().timestamp();
        let tx_id = Self::generate_tx_id(&env, &intent, timestamp);

        let verdict = VerdictRecord {
            tx_id: tx_id.clone(),
            owner: owner.clone(),
            decision: decision.clone(),
            consensus_result: consensus_result.clone(),
            policy_decision: policy_decision.clone(),
            amount: intent.amount,
            vendor: intent.vendor.clone(),
            timestamp,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Verdict(tx_id.clone()), &verdict);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Verdict(tx_id.clone()), TTL_THRESHOLD, TTL_EXTEND);

        // 7. Emit events
        VerdictEmitted {
            tx_id: tx_id.clone(),
            owner: owner.clone(),
            decision: decision.clone(),
            consensus_result: consensus_result.clone(),
            policy_decision: policy_decision.clone(),
        }
        .publish(&env);

        for i in 0..votes.len() {
            let vote = votes.get(i).unwrap();
            VoteRecorded {
                tx_id: tx_id.clone(),
                agent_id: vote.agent_id.clone(),
                decision: vote.decision.clone(),
            }
            .publish(&env);
        }

        Ok(verdict)
    }

    // ── Policy verification (read-only, for simulation) ────────────────

    pub fn verify_policy(
        env: Env,
        owner: Address,
        amount: i128,
        vendor: Symbol,
    ) -> Result<bool, ContractError> {
        Self::check_policy_internal(&env, &owner, amount, &vendor)?;
        Ok(true)
    }

    // ── Query functions ────────────────────────────────────────────────

    pub fn get_verdict(env: Env, tx_id: Symbol) -> Result<VerdictRecord, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Verdict(tx_id))
            .ok_or(ContractError::NotInitialized)
    }

    pub fn get_spend_tracker(env: Env, owner: Address) -> SpendingTracker {
        env.storage()
            .persistent()
            .get(&DataKey::SpendTracker(owner))
            .unwrap_or(SpendingTracker {
                hour_total: 0,
                hour_start: 0,
                day_total: 0,
                day_start: 0,
            })
    }

    // ── Internal helpers ───────────────────────────────────────────────

    fn check_policy_internal(
        env: &Env,
        owner: &Address,
        amount: i128,
        vendor: &Symbol,
    ) -> Result<(), ContractError> {
        let policy: PolicyRules = env
            .storage()
            .persistent()
            .get(&DataKey::Policy(owner.clone()))
            .unwrap_or(PolicyRules {
                max_per_task: i128::MAX,
                max_per_hour: i128::MAX,
                max_per_day: i128::MAX,
                blocked_vendors: Vec::new(env),
                alert_threshold: i128::MAX,
            });

        // blocked_vendors
        for i in 0..policy.blocked_vendors.len() {
            if policy.blocked_vendors.get(i).unwrap() == *vendor {
                return Err(ContractError::VendorBlocked);
            }
        }

        // max_per_task
        if amount > policy.max_per_task {
            return Err(ContractError::MaxPerTaskExceeded);
        }

        // Spending window checks
        let timestamp = env.ledger().timestamp();
        let tracker: SpendingTracker = env
            .storage()
            .persistent()
            .get(&DataKey::SpendTracker(owner.clone()))
            .unwrap_or(SpendingTracker {
                hour_total: 0,
                hour_start: timestamp,
                day_total: 0,
                day_start: timestamp,
            });

        let hour_total = if timestamp - tracker.hour_start > HOUR_SECS {
            0
        } else {
            tracker.hour_total
        };

        let day_total = if timestamp - tracker.day_start > DAY_SECS {
            0
        } else {
            tracker.day_total
        };

        if hour_total + amount > policy.max_per_hour {
            return Err(ContractError::MaxPerHourExceeded);
        }

        if day_total + amount > policy.max_per_day {
            return Err(ContractError::MaxPerDayExceeded);
        }

        Ok(())
    }

    fn update_spend_tracker(env: &Env, owner: &Address, amount: i128) {
        let timestamp = env.ledger().timestamp();
        let key = DataKey::SpendTracker(owner.clone());

        let mut tracker: SpendingTracker = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(SpendingTracker {
                hour_total: 0,
                hour_start: timestamp,
                day_total: 0,
                day_start: timestamp,
            });

        if timestamp - tracker.hour_start > HOUR_SECS {
            tracker.hour_total = 0;
            tracker.hour_start = timestamp;
        }
        if timestamp - tracker.day_start > DAY_SECS {
            tracker.day_total = 0;
            tracker.day_start = timestamp;
        }

        tracker.hour_total += amount;
        tracker.day_total += amount;

        env.storage().persistent().set(&key, &tracker);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    }

    fn generate_tx_id(env: &Env, intent: &IntentData, timestamp: u64) -> Symbol {
        let mut seed = [0u8; 24];
        let ts_bytes = timestamp.to_be_bytes();
        let amt_bytes = (intent.amount as u64).to_be_bytes();
        let vendor_payload = intent.vendor.to_val().get_payload().to_be_bytes();
        seed[0..8].copy_from_slice(&ts_bytes);
        seed[8..16].copy_from_slice(&amt_bytes);
        seed[16..24].copy_from_slice(&vendor_payload);

        let hash = env.crypto().sha256(&soroban_sdk::Bytes::from_array(env, &seed));
        let arr = hash.to_array();

        let hex_chars = b"0123456789abcdef";
        let mut id_buf = [0u8; 16];
        for i in 0..8 {
            id_buf[i * 2] = hex_chars[(arr[i] >> 4) as usize];
            id_buf[i * 2 + 1] = hex_chars[(arr[i] & 0x0f) as usize];
        }

        let id_str = core::str::from_utf8(&id_buf).unwrap_or("0000000000000000");
        Symbol::new(env, id_str)
    }
}
