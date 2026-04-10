use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    NotInitialized = 1,
    Unauthorized = 2,
    AgentNotRegistered = 3,
    AgentAlreadyExists = 4,
    PolicyNotFound = 5,
    ConsensusNotConfigured = 6,
    VendorBlocked = 7,
    MaxPerTaskExceeded = 8,
    MaxPerHourExceeded = 9,
    MaxPerDayExceeded = 10,
    QuorumRejected = 11,
    NoVotesProvided = 12,
    InvalidVoteAgent = 13,
}
