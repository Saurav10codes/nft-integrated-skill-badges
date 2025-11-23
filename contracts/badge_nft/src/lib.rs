#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

// Badge metadata structure
#[contracttype]
#[derive(Clone)]
pub struct BadgeMetadata {
    pub token_id: u64,
    pub owner: Address,
    pub test_id: String,
    pub metadata_uri: String,
    pub minted_at: u64,
}

const BADGES: Symbol = symbol_short!("BADGES");
const COUNTER: Symbol = symbol_short!("COUNTER");
const OWNER_BADGES: Symbol = symbol_short!("OWN_BDGS");

#[contract]
pub struct BadgeNFT;

#[contractimpl]
impl BadgeNFT {
    /// Initialize the contract
    pub fn initialize(env: Env) {
        env.storage().instance().set(&COUNTER, &0u64);
    }

    /// Mint a new badge NFT
    /// receiver: Address that will receive the badge
    /// test_id: ID of the test that was passed
    /// metadata_uri: URI pointing to badge metadata (IPFS or Supabase URL)
    pub fn mint_badge(
        env: Env,
        receiver: Address,
        test_id: String,
        metadata_uri: String,
    ) -> BadgeMetadata {
        // Require authentication from the receiver
        receiver.require_auth();

        // Get and increment counter for token ID
        let mut counter: u64 = env
            .storage()
            .instance()
            .get(&COUNTER)
            .unwrap_or(0);

        counter += 1;
        env.storage().instance().set(&COUNTER, &counter);

        // Create badge metadata
        let badge = BadgeMetadata {
            token_id: counter,
            owner: receiver.clone(),
            test_id: test_id.clone(),
            metadata_uri: metadata_uri.clone(),
            minted_at: env.ledger().timestamp(),
        };

        // Store badge in all badges list
        let mut badges: Vec<BadgeMetadata> = env
            .storage()
            .instance()
            .get(&BADGES)
            .unwrap_or(Vec::new(&env));

        badges.push_back(badge.clone());
        env.storage().instance().set(&BADGES, &badges);

        // Store badge in owner's badges list
        let owner_key = (OWNER_BADGES, receiver.clone());
        let mut owner_badges: Vec<u64> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env));

        owner_badges.push_back(counter);
        env.storage().instance().set(&owner_key, &owner_badges);

        // Emit mint event
        env.events().publish(
            (symbol_short!("MINT"), counter),
            (receiver, test_id, metadata_uri, env.ledger().timestamp()),
        );

        badge
    }

    /// Get badge by token ID
    pub fn get_badge(env: Env, token_id: u64) -> Option<BadgeMetadata> {
        let badges: Vec<BadgeMetadata> = env
            .storage()
            .instance()
            .get(&BADGES)
            .unwrap_or(Vec::new(&env));

        for i in 0..badges.len() {
            let badge = badges.get(i).unwrap();
            if badge.token_id == token_id {
                return Some(badge);
            }
        }

        None
    }

    /// Get all badges owned by an address
    pub fn get_badges_by_owner(env: Env, owner: Address) -> Vec<BadgeMetadata> {
        let owner_key = (OWNER_BADGES, owner);
        let token_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env));

        let mut result = Vec::new(&env);

        for i in 0..token_ids.len() {
            let token_id = token_ids.get(i).unwrap();
            if let Some(badge) = Self::get_badge(env.clone(), token_id) {
                result.push_back(badge);
            }
        }

        result
    }

    /// Get owner of a badge
    pub fn owner_of(env: Env, token_id: u64) -> Option<Address> {
        Self::get_badge(env, token_id).map(|badge| badge.owner)
    }

    /// Get total supply of badges
    pub fn total_supply(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&COUNTER)
            .unwrap_or(0)
    }

    /// Get all minted badges
    pub fn get_all_badges(env: Env) -> Vec<BadgeMetadata> {
        env.storage()
            .instance()
            .get(&BADGES)
            .unwrap_or(Vec::new(&env))
    }

    /// Check if a user has a badge for a specific test
    pub fn has_badge_for_test(env: Env, owner: Address, test_id: String) -> bool {
        let badges = Self::get_badges_by_owner(env, owner);

        for i in 0..badges.len() {
            let badge = badges.get(i).unwrap();
            if badge.test_id == test_id {
                return true;
            }
        }

        false
    }

    /// Get badge count for an owner
    pub fn balance_of(env: Env, owner: Address) -> u32 {
        let owner_key = (OWNER_BADGES, owner);
        let token_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env));

        token_ids.len()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_mint_badge() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BadgeNFT);
        let client = BadgeNFTClient::new(&env, &contract_id);

        // Initialize
        client.initialize();

        // Create test addresses
        let user = Address::generate(&env);
        let test_id = String::from_str(&env, "test-123");
        let metadata_uri = String::from_str(&env, "ipfs://QmXXXXXXXXX");

        // Mint badge
        env.mock_all_auths();
        let badge = client.mint_badge(&user, &test_id, &metadata_uri);

        assert_eq!(badge.token_id, 1);
        assert_eq!(badge.owner, user);
        assert_eq!(badge.test_id, test_id);

        // Check total supply
        assert_eq!(client.total_supply(), 1);

        // Check balance
        assert_eq!(client.balance_of(&user), 1);
    }

    #[test]
    fn test_get_badges_by_owner() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BadgeNFT);
        let client = BadgeNFTClient::new(&env, &contract_id);

        client.initialize();

        let user = Address::generate(&env);

        env.mock_all_auths();

        // Mint multiple badges
        for i in 1..=3 {
            let test_id = String::from_str(&env, &format!("test-{}", i));
            let metadata_uri = String::from_str(&env, &format!("ipfs://QmXXX{}", i));
            client.mint_badge(&user, &test_id, &metadata_uri);
        }

        // Get user badges
        let badges = client.get_badges_by_owner(&user);
        assert_eq!(badges.len(), 3);

        // Check balance
        assert_eq!(client.balance_of(&user), 3);
    }

    #[test]
    fn test_has_badge_for_test() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BadgeNFT);
        let client = BadgeNFTClient::new(&env, &contract_id);

        client.initialize();

        let user = Address::generate(&env);
        let test_id = String::from_str(&env, "test-123");
        let metadata_uri = String::from_str(&env, "ipfs://QmXXXXXXXXX");

        env.mock_all_auths();

        // User shouldn't have badge initially
        assert!(!client.has_badge_for_test(&user, &test_id));

        // Mint badge
        client.mint_badge(&user, &test_id, &metadata_uri);

        // Now user should have badge
        assert!(client.has_badge_for_test(&user, &test_id));
    }
}
