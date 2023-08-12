// Find all our documentation at https://docs.near.org

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;

use near_sdk::json_types::U128;
use near_sdk::{
    env, near_bindgen, require, serde::Serialize, AccountId, Balance, CryptoHash, PanicOnDefault,
    Promise,
};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    owner_id: AccountId,
    next_game_id: U128,
    games: UnorderedMap<U128, Game>,
}
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault, Serialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Game {
    owner_id: AccountId,
    prize_pool_amount: U128,
    player_one: PlayerData,
    player_two: PlayerData,
    expiration_timestamp_in_seconds: u64,
}
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault, Serialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct PlayerData {
    play_address: AccountId,
    decision_hash: Option<CryptoHash>,
    salt_hash: Option<CryptoHash>,
    decision: u64,
}

// Implement the contract structure
#[near_bindgen]
impl Contract {
    pub fn get_game(&self, id: U128) -> Game {
        return self.games.get(&id).unwrap().clone();
    }

    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner_id,
            next_game_id: near_sdk::json_types::U128(0),
            games: UnorderedMap::new("map-game".as_bytes()),
        }
    }
    #[payable]
    pub fn create_game(&mut self, player_one_address: AccountId, player_two_address: AccountId) {
        let sender: AccountId = env::predecessor_account_id();
        let amount: Balance = env::attached_deposit();
        self.next_game_id = near_sdk::json_types::U128(self.next_game_id.0 + 1);
        let new_game = Game {
            owner_id: sender,
            prize_pool_amount: near_sdk::json_types::U128(amount),
            player_one: PlayerData {
                play_address: player_one_address,
                decision_hash: Option::None,
                salt_hash: Option::None,
                decision: 0,
            },
            player_two: PlayerData {
                play_address: player_two_address,
                decision_hash: Option::None,
                salt_hash: Option::None,
                decision: 0,
            },
            expiration_timestamp_in_seconds: env::block_timestamp() + 5 * 60,
        };
        self.games.insert(&self.next_game_id, &new_game);
        Promise::new(self.owner_id.clone()).transfer(amount);
    }

    pub fn submit_decision(
        &mut self,
        game_id: U128,
        decision_hash: CryptoHash,
        salt_hash: CryptoHash,
    ) {
        let mut game = self.games.remove(&game_id).unwrap();
        let sender = env::predecessor_account_id();
        assert!(game.player_one.play_address == sender || game.player_two.play_address == sender);
        let player_data_mut_ref = if game.player_one.play_address == sender {
            &mut game.player_one
        } else {
            &mut game.player_two
        };

        Option::replace(&mut player_data_mut_ref.decision_hash, decision_hash);
        Option::replace(&mut player_data_mut_ref.salt_hash, salt_hash);

        self.games.insert(&game_id, &game);
    }

    pub fn reveal_decision(&mut self, game_id: U128, salt: String) {
        let mut game = self.games.remove(&game_id).unwrap();
        // require!(
        //     game.expiration_timestamp_in_seconds >= env::block_timestamp(),
        //     "Not Expiration"
        // );

        require!(
            game.player_one.decision_hash.is_some() && game.player_two.decision_hash.is_some()
        );

        let sender = env::predecessor_account_id();
        assert!(game.player_one.play_address == sender || game.player_two.play_address == sender);
        let (current_player_data_mut_ref, another_player_data_mut_ref) =
            if game.player_one.play_address == sender {
                (&mut game.player_one, &mut game.player_two)
            } else {
                (&mut game.player_two, &mut game.player_one)
            };
        let mut hash = CryptoHash::default();
        hash.copy_from_slice(&env::sha256(salt.as_bytes()));
        assert!(&current_player_data_mut_ref.salt_hash.unwrap() == &hash);

        let split_hash = {
            let mut split_hash = Vec::new();
            split_hash.extend_from_slice(1.to_string().as_bytes());
            split_hash.extend_from_slice(salt.as_bytes());
            CryptoHash::try_from(env::sha256(&split_hash)).unwrap()
        };

        let steal_hash = {
            let mut steal_hash = Vec::new();
            steal_hash.extend_from_slice(2.to_string().as_bytes());
            steal_hash.extend_from_slice(salt.as_bytes());
            CryptoHash::try_from(env::sha256(&steal_hash)).unwrap()
        };

        if current_player_data_mut_ref.decision_hash.unwrap() == split_hash {
            current_player_data_mut_ref.decision = 1
        } else if current_player_data_mut_ref.decision_hash.unwrap() == steal_hash {
            current_player_data_mut_ref.decision = 2
        } else {
            assert!(false)
        };

        if another_player_data_mut_ref.decision != 0 {
            if (game.player_one.decision == game.player_two.decision)
                && (game.player_one.decision == 1)
            {
                let player_one_amount = game.prize_pool_amount.0 / 2;
                let player_two_amount = game.prize_pool_amount.0 - player_one_amount;
                Promise::new(game.player_one.play_address).transfer(player_one_amount);
                Promise::new(game.player_two.play_address).transfer(player_two_amount);
            } else if game.player_one.decision != game.player_two.decision {
                let steal_player_address = if game.player_one.decision == 1 {
                    game.player_two.play_address
                } else {
                    game.player_one.play_address
                };
                Promise::new(steal_player_address).transfer(game.prize_pool_amount.into());
            } else {
                Promise::new(game.owner_id).transfer(game.prize_pool_amount.into());
            };
        } else {
            self.games.insert(&game_id, &game);
        }
    }

    #[payable]
    pub fn release_funds_after_expiration(&mut self, game_id: U128) {
        let game = self.games.remove(&game_id).unwrap();
        require!(
            game.expiration_timestamp_in_seconds < env::block_timestamp(),
            "Not Expiration"
        );
        if game.player_one.decision == game.player_two.decision {
            Promise::new(game.owner_id).transfer(game.prize_pool_amount.into());
        } else if game.player_one.decision != 0 {
            Promise::new(game.player_one.play_address).transfer(game.prize_pool_amount.into());
        } else {
            Promise::new(game.player_two.play_address).transfer(game.prize_pool_amount.into());
        };
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;
    use uint::hex;

    use super::*;
    const NEAR: u128 = 1000000000000000000000000;

    const SPLIT_HASH: &str = "c36562c53838cb8ed23e9de694b67c8f42ebd246ce5073a43a8eac6535122504";
    const STEAL_HASH: &str = "113ad07c970a19b82940b83944f90310daeb8c50c6a57bcf8641e69e9246d7c6";

    const SLAT_HASH: &str = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
    const SLAT: &str = "1234";

    fn get_context(predecessor_account_id: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .storage_usage(env::storage_usage())
            .signer_account_id(predecessor_account_id.clone())
            .predecessor_account_id(predecessor_account_id);
        builder
    }

    #[test]
    fn test_new() {
        let mut contract = Contract::new(accounts(1).into());
        get_context(accounts(1));
        contract.create_game(accounts(2).into(), accounts(3).into())
    }

    #[test]
    fn test_submit_decision() {
        let mut contract = Contract::new(accounts(1).into());
        get_context(accounts(1));
        contract.create_game(accounts(2).into(), accounts(3).into());
        get_context(accounts(2));
        contract.submit_decision(near_sdk::json_types::U128(1), [0; 32], [0; 32])
    }

    #[test]
    fn test_reveal_decision() {
        let mut contract = Contract::new(accounts(1).into());
        get_context(accounts(1));
        contract.create_game(accounts(2).into(), accounts(3).into());
        get_context(accounts(2));
        contract.submit_decision(
            near_sdk::json_types::U128(1),
            hex::decode(SPLIT_HASH).unwrap().try_into().unwrap(),
            hex::decode(SLAT_HASH).unwrap().try_into().unwrap(),
        );

        contract.reveal_decision(near_sdk::json_types::U128(1), SLAT.to_owned());
    }

    #[test]
    fn test_reveal_decision_two_player() {
        let mut ctx = get_context(accounts(1));
        testing_env!(ctx.build());
        println!("{}", ctx.context.signer_account_id);
        let mut contract = Contract::new(accounts(0).into());
        println!("{}", ctx.context.signer_account_id);
        testing_env!(ctx
            .attached_deposit(7 * NEAR)
            .storage_usage(env::storage_usage())
            .predecessor_account_id(accounts(1))
            .build());

        println!("{}", ctx.context.signer_account_id);
        contract.create_game(accounts(1).into(), accounts(2).into());
        println!("{}", ctx.context.signer_account_id);
        testing_env!(ctx
            .predecessor_account_id(accounts(1))
            .storage_usage(env::storage_usage())
            .build());
        println!("{}", ctx.context.signer_account_id);
        contract.submit_decision(
            near_sdk::json_types::U128(1),
            hex::decode(SPLIT_HASH).unwrap().try_into().unwrap(),
            hex::decode(SLAT_HASH).unwrap().try_into().unwrap(),
        );
        contract.reveal_decision(near_sdk::json_types::U128(1), SLAT.to_owned());

        testing_env!(ctx.predecessor_account_id(accounts(2)).build());
        println!("{}", ctx.context.signer_account_id);
        contract.submit_decision(
            near_sdk::json_types::U128(1),
            hex::decode(SPLIT_HASH).unwrap().try_into().unwrap(),
            hex::decode(SLAT_HASH).unwrap().try_into().unwrap(),
        );

        contract.reveal_decision(near_sdk::json_types::U128(1), SLAT.to_owned());
        contract.get_game(near_sdk::json_types::U128(1));
        // println!("{}", ctx.context.account_balance);
        // assert!(ctx.context.account_balance == 103500000000000000000000000);
    }
}
