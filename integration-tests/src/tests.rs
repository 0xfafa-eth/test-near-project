use near_units::parse_near;
use serde_json::json;
use std::{env, fs};
use workspaces::{Account, Block, Contract};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let wasm_arg: &str = &(env::args().nth(1).unwrap());
    let wasm_filepath = fs::canonicalize(env::current_dir()?.join(wasm_arg))?;

    let worker = workspaces::sandbox().await?;
    let wasm = std::fs::read(wasm_filepath)?;
    let contract = worker.dev_deploy(&wasm).await?;

    // create accounts
    let account = worker.dev_create_account().await?;
    let alice = account
        .create_subaccount("alice")
        .initial_balance(parse_near!("30 N"))
        .transact()
        .await?
        .into_result()?;
    let bob = account
        .create_subaccount("bob")
        .initial_balance(parse_near!("1 N"))
        .transact()
        .await?
        .into_result()?;
    let dunny = account
        .create_subaccount("dunny")
        .initial_balance(parse_near!("1 N"))
        .transact()
        .await?
        .into_result()?;

    alice
        .call(contract.id(), "new")
        .args_json(json!({ "owner_id": "alice" }))
        .transact()
        .await?
        .is_success();

    // begin tests
    test_reveal_decision_split_split(&alice, &bob, &dunny, &contract).await?;
    test_reveal_decision_sleat_split(&alice, &bob, &dunny, &contract).await?;
    test_reveal_decision_sleat_sleat(&alice, &bob, &dunny, &contract).await?;

    Ok(())
}

async fn test_reveal_decision_split_split(
    alice: &Account,
    bob: &Account,
    dunny: &Account,
    contract: &Contract,
) -> anyhow::Result<()> {
    assert!(alice
        .call(contract.id(), "create_game")
        .args_json(json!({ "player_one_address":bob.id(), "player_two_address":dunny.id()}))
        .deposit(parse_near!("5 N"))
        .transact()
        .await?
        .is_success());
    println!("      Passed ✅ create_game");

    bob.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "1",
            "decision_hash": hex::decode("c36562c53838cb8ed23e9de694b67c8f42ebd246ce5073a43a8eac6535122504")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    dunny.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "1",
            "decision_hash": hex::decode("c36562c53838cb8ed23e9de694b67c8f42ebd246ce5073a43a8eac6535122504")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    bob.call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "1",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;

    assert!(dunny.view_account().await?.balance == 999403916296261200000000);

    dunny
        .call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "1",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;
    assert!(dunny.view_account().await?.balance == 3498712022650445100000000);
    println!("      Passed ✅ reveal_decision");

    Ok(())
}

async fn test_reveal_decision_sleat_split(
    alice: &Account,
    bob: &Account,
    dunny: &Account,
    contract: &Contract,
) -> anyhow::Result<()> {
    assert!(alice
        .call(contract.id(), "create_game")
        .args_json(json!({ "player_one_address":bob.id(), "player_two_address":dunny.id()}))
        .deposit(parse_near!("5 N"))
        .transact()
        .await?
        .is_success());
    println!("      Passed ✅ create_game");

    bob.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "2",
            "decision_hash": hex::decode("c36562c53838cb8ed23e9de694b67c8f42ebd246ce5073a43a8eac6535122504")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    dunny.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "2",
            "decision_hash": hex::decode("113ad07c970a19b82940b83944f90310daeb8c50c6a57bcf8641e69e9246d7c6")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    bob.call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "2",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;

    assert!(dunny.view_account().await?.balance == 3498097899708288100000000);

    dunny
        .call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "2",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;

    assert!(dunny.view_account().await?.balance == 8497434724890785900000000);
    println!("      Passed ✅ reveal_decision");

    Ok(())
}

async fn test_reveal_decision_sleat_sleat(
    alice: &Account,
    bob: &Account,
    dunny: &Account,
    contract: &Contract,
) -> anyhow::Result<()> {
    assert!(alice
        .call(contract.id(), "create_game")
        .args_json(json!({ "player_one_address":bob.id(), "player_two_address":dunny.id()}))
        .deposit(parse_near!("5 N"))
        .transact()
        .await?
        .is_success());
    println!("      Passed ✅ create_game");

    bob.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "3",
            "decision_hash": hex::decode("113ad07c970a19b82940b83944f90310daeb8c50c6a57bcf8641e69e9246d7c6")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    dunny.call(contract.id(), "submit_decision")
        .args_json(json!({
            "game_id": "3",
            "decision_hash": hex::decode("113ad07c970a19b82940b83944f90310daeb8c50c6a57bcf8641e69e9246d7c6")?,
            "salt_hash":hex::decode("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4")?,
        }))
        .transact()
        .await?
        .into_result()?;

    bob.call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "3",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;

    assert!(alice.view_account().await?.balance == 14997816441344866100000000);

    dunny
        .call(contract.id(), "reveal_decision")
        .args_json(json!({
            "game_id": "3",
            "salt": "1234",
        }))
        .transact()
        .await?
        .into_result()?;

    assert!(alice.view_account().await?.balance == 19997816441344866100000000);
    println!("      Passed ✅ reveal_decision");

    Ok(())
}
