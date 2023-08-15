import "regenerator-runtime/runtime";
import React from "react";
import { Buffer } from "buffer";
import "./assets/global.css";
import { ChakraProvider } from "@chakra-ui/react";

import { EducationalText, SignInPrompt, SignOutButton } from "./ui-components";

export default function App({ isSignedIn, contractId, wallet }) {
  const [uiPleaseWait, setUiPleaseWait] = React.useState(false);

  // Get blockchian state once on component load
  React.useEffect(() => {}, []);

  /// If user not signed-in with wallet - show prompt
  if (!isSignedIn) {
    // Sign-in flow will reload the page later
    return <SignInPrompt onClick={() => wallet.signIn()} />;
  }

  function createGame(e) {
    e.preventDefault();
    setUiPleaseWait(true);

    const { player_one, player_two } = e.target.elements;

    wallet
      .callMethod({
        method: "create_game",
        args: {
          player_one_address: player_one.value,
          player_two_address: player_two.value,
        },
        contractId,
        deposit: "1000000000000000000000000",
      })
      .finally(() => {
        setUiPleaseWait(false);
      });
  }

  function submitDecision(e) {
    e.preventDefault();
    setUiPleaseWait(true);

    const { salt_hash, game_id, decision_hash } = e.target.elements;
    wallet
      .callMethod({
        method: "submit_decision",
        args: {
          game_id: `${game_id.value}`,
          decision_hash: Array.from(Buffer.from(decision_hash.value, "hex")),
          salt_hash: Array.from(Buffer.from(salt_hash.value, "hex")),
        },
        contractId,
      })
      .finally(() => {
        setUiPleaseWait(false);
      });
  }

  function revealDecision(e) {
    e.preventDefault();
    setUiPleaseWait(true);

    const { game_id, salt } = e.target.elements;
    wallet
      .callMethod({
        method: "reveal_decision",
        args: {
          game_id: game_id.value,
          salt: `${salt.value}`,
        },
        contractId,
      })
      .finally(() => {
        setUiPleaseWait(false);
      });
  }

  return (
    <>
      <ChakraProvider>
        <SignOutButton
          accountId={wallet.accountId}
          onClick={() => wallet.signOut()}
        />
        <main className={uiPleaseWait ? "please-wait" : ""}>
          <form onSubmit={createGame} className="create">
            <br></br>
            <div>
              <label>Input player one address: </label>
              <input autoComplete="off" id="player_one" />
            </div>
            <div>
              <label>Input player two address: </label>
              <input autoComplete="off" id="player_two" />
            </div>
            <br />
            <button>
              <span>Create</span>
              <div className="loader"></div>
            </button>
          </form>
          <form onSubmit={submitDecision} className="create">
            <div>
              <label>Input your game id: </label>
              <input autoComplete="off" id="game_id" />
              <div>
                <label>Input your decision hash :</label>

                <input autoComplete="off" id="decision_hash" />
              </div>

              <div>
                <label>Input your salt hash :</label>
                <input autoComplete="off" id="salt_hash" />
              </div>
              <button>
                <span> submit </span>
                <div className="loader"></div>
              </button>
            </div>
          </form>

          <form onSubmit={revealDecision} className="create">
            <div>
              <label>Input your game id: </label>
              <input autoComplete="off" id="game_id" />

              <div>
                <label>Input your salt :</label>
                <input autoComplete="off" id="salt" />
              </div>
              <button>
                <span> reveal </span>
                <div className="loader"></div>
              </button>
            </div>
          </form>

          {/* <EducationalText /> */}
        </main>
      </ChakraProvider>
    </>
  );
}
