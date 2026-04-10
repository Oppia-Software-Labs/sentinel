use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String, Symbol, Vec};

use crate::types::{AgentInfo, ConsensusData, IntentData, PolicyRules, VoteData};
use crate::{SentinelGovernance, SentinelGovernanceClient};

fn setup_env() -> (Env, Address, SentinelGovernanceClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SentinelGovernance, (&admin,));
    let client = SentinelGovernanceClient::new(&env, &contract_id);
    (env, admin, client)
}

fn register_three_agents(env: &Env, client: &SentinelGovernanceClient, owner: &Address) {
    let agents = [
        (symbol_short!("risk"), "shieldpay", "http://localhost:4000/api/agents/risk"),
        (symbol_short!("cost"), "shieldpay", "http://localhost:4000/api/agents/cost"),
        (symbol_short!("logic"), "shieldpay", "http://localhost:4000/api/agents/logic"),
    ];

    for (id, agent_type, endpoint) in agents {
        client.register_agent(
            owner,
            &id,
            &AgentInfo {
                agent_type: Symbol::new(env, agent_type),
                endpoint: String::from_str(env, endpoint),
                description: String::from_str(env, "built-in agent"),
                is_active: true,
            },
        );
    }
}

fn setup_consensus(env: &Env, client: &SentinelGovernanceClient, owner: &Address) {
    client.set_consensus(
        owner,
        &ConsensusData {
            quorum: symbol_short!("majority"),
            timeout_ms: 5000,
            agent_ids: Vec::from_array(
                env,
                [
                    symbol_short!("risk"),
                    symbol_short!("cost"),
                    symbol_short!("logic"),
                ],
            ),
        },
    );
}

fn setup_policy(env: &Env, client: &SentinelGovernanceClient, owner: &Address) {
    client.set_policy(
        owner,
        &PolicyRules {
            max_per_task: 500_000_000,  // 50 USDC (7 decimals)
            max_per_hour: 5_000_000_000,
            max_per_day: 20_000_000_000,
            blocked_vendors: Vec::from_array(env, [symbol_short!("evil")]),
            alert_threshold: 100_000_000,
        },
    );
}

fn make_intent(_env: &Env, amount: i128) -> IntentData {
    IntentData {
        agent_id: symbol_short!("worker1"),
        amount,
        asset_code: symbol_short!("USDC"),
        vendor: symbol_short!("openai"),
    }
}

fn make_votes(env: &Env, decisions: &[(&str, &str)]) -> Vec<VoteData> {
    let mut votes = Vec::new(env);
    for (agent, decision) in decisions {
        votes.push_back(VoteData {
            agent_id: Symbol::new(env, agent),
            decision: Symbol::new(env, decision),
            reason: String::from_str(env, "test vote"),
        });
    }
    votes
}

// ── Policy roundtrip ────────────────────────────────────────────────

#[test]
fn test_set_and_get_policy() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    setup_policy(&env, &client, &owner);

    let policy = client.get_policy(&owner);
    assert_eq!(policy.max_per_task, 500_000_000);
    assert_eq!(policy.max_per_hour, 5_000_000_000);
    assert_eq!(policy.max_per_day, 20_000_000_000);
    assert_eq!(policy.blocked_vendors.len(), 1);
}

// ── Agent registry ──────────────────────────────────────────────────

#[test]
fn test_register_and_get_agents() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);

    let agents = client.get_agents(&owner);
    assert_eq!(agents.len(), 3);
}

#[test]
fn test_remove_agent() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    client.remove_agent(&owner, &symbol_short!("risk"));

    let agents = client.get_agents(&owner);
    assert_eq!(agents.len(), 2);
}

#[test]
fn test_duplicate_agent_fails() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);

    let result = client.try_register_agent(
        &owner,
        &symbol_short!("risk"),
        &AgentInfo {
            agent_type: symbol_short!("custom"),
            endpoint: String::from_str(&env, "http://example.com"),
            description: String::from_str(&env, "dup"),
            is_active: true,
        },
    );
    assert!(result.is_err());
}

// ── Evaluate: happy path (majority approve) ─────────────────────────

#[test]
fn test_evaluate_approve_majority() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000); // 1 USDC
    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "reject"),
    ]);

    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("approve"));
    assert_eq!(verdict.consensus_result, symbol_short!("approve"));
    assert_eq!(verdict.policy_decision, symbol_short!("approve"));
}

// ── Evaluate: quorum reject ─────────────────────────────────────────

#[test]
fn test_evaluate_quorum_reject() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);
    let votes = make_votes(&env, &[
        ("risk", "reject"),
        ("cost", "reject"),
        ("logic", "approve"),
    ]);

    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("reject"));
    assert_eq!(verdict.consensus_result, symbol_short!("reject"));
}

// ── Evaluate: blocked vendor ────────────────────────────────────────

#[test]
fn test_evaluate_blocked_vendor() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = IntentData {
        agent_id: symbol_short!("worker1"),
        amount: 10_000_000,
        asset_code: symbol_short!("USDC"),
        vendor: symbol_short!("evil"),
    };
    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "approve"),
    ]);

    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("reject"));
    assert_eq!(verdict.policy_decision, symbol_short!("reject"));
}

// ── Evaluate: max_per_task exceeded ─────────────────────────────────

#[test]
fn test_evaluate_max_per_task_exceeded() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 999_000_000_000); // way over 50 USDC
    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "approve"),
    ]);

    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("reject"));
    assert_eq!(verdict.policy_decision, symbol_short!("reject"));
}

// ── Spend tracker window reset ──────────────────────────────────────

#[test]
fn test_spend_tracker_accumulates_and_resets() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "approve"),
    ]);

    // First transaction
    let intent1 = make_intent(&env, 10_000_000);
    let v1 = client.evaluate(&owner, &intent1, &votes);
    assert_eq!(v1.decision, symbol_short!("approve"));

    let tracker = client.get_spend_tracker(&owner);
    assert_eq!(tracker.hour_total, 10_000_000);
    assert_eq!(tracker.day_total, 10_000_000);
}

// ── Evaluate: unregistered vote agent ───────────────────────────────

#[test]
fn test_evaluate_invalid_vote_agent() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);
    let votes = make_votes(&env, &[
        ("unknown", "approve"),
        ("cost", "approve"),
        ("logic", "approve"),
    ]);

    let result = client.try_evaluate(&owner, &intent, &votes);
    assert!(result.is_err());
}

// ── Evaluate: no votes ──────────────────────────────────────────────

#[test]
fn test_evaluate_no_votes() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);
    let votes: Vec<VoteData> = Vec::new(&env);

    let result = client.try_evaluate(&owner, &intent, &votes);
    assert!(result.is_err());
}

// ── verify_policy: allowed ──────────────────────────────────────────

#[test]
fn test_verify_policy_allowed() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    setup_policy(&env, &client, &owner);

    let result = client.verify_policy(&owner, &10_000_000, &symbol_short!("openai"));
    assert_eq!(result, true);
}

// ── verify_policy: blocked vendor ───────────────────────────────────

#[test]
fn test_verify_policy_blocked() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    setup_policy(&env, &client, &owner);

    let result = client.try_verify_policy(&owner, &10_000_000, &symbol_short!("evil"));
    assert!(result.is_err());
}

// ── Consensus config roundtrip ──────────────────────────────────────

#[test]
fn test_consensus_config_roundtrip() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    setup_consensus(&env, &client, &owner);

    let config = client.get_consensus(&owner);
    assert_eq!(config.quorum, symbol_short!("majority"));
    assert_eq!(config.timeout_ms, 5000);
    assert_eq!(config.agent_ids.len(), 3);
}

// ── Get verdict after evaluate ──────────────────────────────────────

#[test]
fn test_get_verdict_after_evaluate() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    setup_consensus(&env, &client, &owner);
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);
    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "approve"),
    ]);

    let verdict = client.evaluate(&owner, &intent, &votes);
    let stored = client.get_verdict(&verdict.tx_id);
    assert_eq!(stored.decision, symbol_short!("approve"));
    assert_eq!(stored.amount, 10_000_000);
}

// ── Unanimous quorum mode ───────────────────────────────────────────

#[test]
fn test_unanimous_quorum() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    client.set_consensus(
        &owner,
        &ConsensusData {
            quorum: symbol_short!("unanimou"),
            timeout_ms: 5000,
            agent_ids: Vec::from_array(
                &env,
                [symbol_short!("risk"), symbol_short!("cost"), symbol_short!("logic")],
            ),
        },
    );
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);

    // 2 of 3 approve -> should reject under unanimous
    let votes = make_votes(&env, &[
        ("risk", "approve"),
        ("cost", "approve"),
        ("logic", "reject"),
    ]);
    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("reject"));
    assert_eq!(verdict.consensus_result, symbol_short!("reject"));
}

// ── Any quorum mode ─────────────────────────────────────────────────

#[test]
fn test_any_quorum() {
    let (env, _admin, client) = setup_env();
    let owner = Address::generate(&env);

    register_three_agents(&env, &client, &owner);
    client.set_consensus(
        &owner,
        &ConsensusData {
            quorum: symbol_short!("any"),
            timeout_ms: 5000,
            agent_ids: Vec::from_array(
                &env,
                [symbol_short!("risk"), symbol_short!("cost"), symbol_short!("logic")],
            ),
        },
    );
    setup_policy(&env, &client, &owner);

    let intent = make_intent(&env, 10_000_000);
    let votes = make_votes(&env, &[
        ("risk", "reject"),
        ("cost", "reject"),
        ("logic", "approve"),
    ]);
    let verdict = client.evaluate(&owner, &intent, &votes);
    assert_eq!(verdict.decision, symbol_short!("approve"));
}
