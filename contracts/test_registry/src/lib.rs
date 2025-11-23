#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol, Vec};

// Data structure for test metadata
#[contracttype]
#[derive(Clone)]
pub struct TestMetadata {
    pub test_id: String,
    pub creator: String,
    pub metadata_cid: String,
    pub created_at: u64,
}

const TESTS: Symbol = symbol_short!("TESTS");

#[contract]
pub struct TestRegistry;

#[contractimpl]
impl TestRegistry {
    /// Register a new test on-chain
    /// test_id: Unique identifier for the test (from Supabase)
    /// creator: Stellar address of test creator
    /// metadata_cid: IPFS CID or URL to test metadata
    pub fn register_test(
        env: Env,
        test_id: String,
        creator: String,
        metadata_cid: String,
    ) -> TestMetadata {
        let mut tests: Vec<TestMetadata> = env
            .storage()
            .instance()
            .get(&TESTS)
            .unwrap_or(Vec::new(&env));

        let test_metadata = TestMetadata {
            test_id: test_id.clone(),
            creator: creator.clone(),
            metadata_cid: metadata_cid.clone(),
            created_at: env.ledger().timestamp(),
        };

        tests.push_back(test_metadata.clone());
        env.storage().instance().set(&TESTS, &tests);

        // Emit event for indexing
        env.events().publish(
            (symbol_short!("TEST_REG"), test_id.clone()),
            (creator, metadata_cid, env.ledger().timestamp()),
        );

        test_metadata
    }

    /// Get test metadata by test_id
    pub fn get_test(env: Env, test_id: String) -> Option<TestMetadata> {
        let tests: Vec<TestMetadata> = env
            .storage()
            .instance()
            .get(&TESTS)
            .unwrap_or(Vec::new(&env));

        for i in 0..tests.len() {
            let test = tests.get(i).unwrap();
            if test.test_id == test_id {
                return Some(test);
            }
        }

        None
    }

    /// Get all registered tests
    pub fn list_tests(env: Env) -> Vec<TestMetadata> {
        env.storage()
            .instance()
            .get(&TESTS)
            .unwrap_or(Vec::new(&env))
    }

    /// Get total count of registered tests
    pub fn get_test_count(env: Env) -> u32 {
        let tests: Vec<TestMetadata> = env
            .storage()
            .instance()
            .get(&TESTS)
            .unwrap_or(Vec::new(&env));

        tests.len()
    }

    /// Check if a test exists
    pub fn test_exists(env: Env, test_id: String) -> bool {
        let tests: Vec<TestMetadata> = env
            .storage()
            .instance()
            .get(&TESTS)
            .unwrap_or(Vec::new(&env));

        for i in 0..tests.len() {
            let test = tests.get(i).unwrap();
            if test.test_id == test_id {
                return true;
            }
        }

        false
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_register_and_get_test() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestRegistry);
        let client = TestRegistryClient::new(&env, &contract_id);

        let test_id = String::from_str(&env, "test-123");
        let creator = String::from_str(&env, "GXXXXXXXXXXXXXXXXXXXXXX");
        let metadata_cid = String::from_str(&env, "QmXXXXXXXXXXXXXXXXXX");

        // Register test
        let result = client.register_test(&test_id, &creator, &metadata_cid);

        assert_eq!(result.test_id, test_id);
        assert_eq!(result.creator, creator);
        assert_eq!(result.metadata_cid, metadata_cid);

        // Get test
        let retrieved = client.get_test(&test_id);
        assert!(retrieved.is_some());

        let test = retrieved.unwrap();
        assert_eq!(test.test_id, test_id);

        // Check existence
        assert!(client.test_exists(&test_id));

        // Get count
        assert_eq!(client.get_test_count(), 1);
    }

    #[test]
    fn test_list_tests() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestRegistry);
        let client = TestRegistryClient::new(&env, &contract_id);

        // Register multiple tests
        for i in 1..=3 {
            let test_id = String::from_str(&env, &format!("test-{}", i));
            let creator = String::from_str(&env, "GXXXXXXXXXXXXXXXXXXXXXX");
            let metadata_cid = String::from_str(&env, &format!("QmXXXXX{}", i));

            client.register_test(&test_id, &creator, &metadata_cid);
        }

        let tests = client.list_tests();
        assert_eq!(tests.len(), 3);
    }
}
