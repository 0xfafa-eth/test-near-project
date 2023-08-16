import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { providers, utils } from "near-api-js";
import { CONTRACT_ID } from "../../constants";
import { Buffer } from "buffer";
import { useWalletSelector } from "../../contexts/WalletSelectorContext.tsx";
import { useParams } from "react-router-dom";
import { Game } from "../../type";
import { useForm } from "react-hook-form";

const BOATLOAD_OF_GAS = utils.format.parseNearAmount("0.00000000003")!;

export function Playground() {
  const { selector, modal, accountId } = useWalletSelector();
  const params = useParams();
  const [game, SetGame] = useState<Game>();
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmitDecision(values: any) {
    const wallet = await selector.wallet();
    await wallet.signAndSendTransaction({
      signerId: accountId!,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "submit_decision",
            args: {
              game_id: params.game_id,
              decision_hash: Array.from(
                Buffer.from(
                  values.decision_hash.toLowerCase().replace("0x", ""),
                  "hex"
                )
              ),
              salt_hash: Array.from(
                Buffer.from(
                  values.salt_hash.toLowerCase().replace("0x", ""),
                  "hex"
                )
              ),
            },
            gas: BOATLOAD_OF_GAS,
            deposit: utils.format.parseNearAmount("0")!,
          },
        },
      ],
    });
  }

  function SubmitDecision() {
    return (
      <form onSubmit={handleSubmit(onSubmitDecision)}>
        <FormControl isInvalid={errors.decision_hash}>
          <FormLabel htmlFor="decision_hash">Decision Hash</FormLabel>
          <Input
            id="decision_hash"
            {...register("decision_hash", {
              required: true,
              pattern: /(0[xX])?[0-9a-fA-F]{64}/,
            })}
          />
          <FormErrorMessage>
            {errors.decision_hash && errors.decision_hash.message}
          </FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={errors.salt_hash}>
          <FormLabel htmlFor="decision_hash">Salt Hash</FormLabel>
          <Input
            id="salt_hash"
            {...register("salt_hash", {
              required: true,
              pattern: /^(0[xX])?[0-9a-fA-F]{64}$/,
            })}
          />
          <FormErrorMessage>
            {errors.salt_hash && errors.salt_hash.message}
          </FormErrorMessage>
        </FormControl>

        <Button
          mt={4}
          colorScheme="teal"
          isLoading={isSubmitting}
          type="submit"
        >
          Submit
        </Button>
      </form>
    );
  }

  function Expiration() {
    return <Text>This Game is Expiration</Text>;
  }

  async function onRevealDecision(values: any) {
    const wallet = await selector.wallet();
    await wallet.signAndSendTransaction({
      signerId: accountId!,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "reveal_decision",
            args: {
              game_id: params.game_id,
              salt: values.salt,
            },
            gas: BOATLOAD_OF_GAS,
            deposit: utils.format.parseNearAmount("0")!,
          },
        },
      ],
    });
  }

  function RevealDecision() {
    return (
      <form onSubmit={handleSubmit(onRevealDecision)}>
        <FormControl isInvalid={errors.salt}>
          <FormLabel htmlFor="salt">Salt</FormLabel>
          <Input
            id="salt"
            {...register("salt", {
              required: true,
            })}
          />
          <FormErrorMessage>
            {errors.salt && errors.salt.message}
          </FormErrorMessage>
        </FormControl>
        <Button
          mt={4}
          colorScheme="teal"
          isLoading={isSubmitting}
          type="submit"
        >
          Submit
        </Button>
      </form>
    );
  }

  function GameEnd() {
    return <Text>This Game is End</Text>;
  }

  function get_my_op(accountId: string, game: Game) {
    return {
      self:
        game.player_one.play_address == accountId
          ? game?.player_one
          : game?.player_two,
      op:
        game.player_one.play_address == accountId
          ? game?.player_one
          : game?.player_two,
    };
  }

  function check_stage(accountId: string | null, game: Game) {
    if (
      game.player_one.play_address == accountId ||
      game.player_two.play_address == accountId
    ) {
      let self = get_my_op(accountId, game).self;
      let op = get_my_op(accountId, game).op;
      if (!self.decision_hash) {
        return <SubmitDecision />;
      } else if (!op.decision_hash) {
        return <Text>Wait for opponent </Text>;
      } else {
        return <RevealDecision />;
      }
    }
  }

  function check_is_player(accountId: string | null, game: Game | undefined) {
    return (
      game?.player_one.play_address == accountId ||
      game?.player_two.play_address == accountId
    );
  }

  useEffect(() => {
    if (!params.game_id) {
      console.log("to 404");
    }
    const provider = new providers.JsonRpcProvider({
      url: selector.options.network.nodeUrl,
    });
    provider
      .query({
        request_type: "call_function",
        account_id: CONTRACT_ID,
        method_name: "get_game",
        args_base64: Buffer.from(
          JSON.stringify({ id: `${params.game_id}` })
        ).toString("base64"),
        finality: "optimistic",
      })
      .then((res: any) => {
        SetGame(JSON.parse(Buffer.from(res.result).toString()));
      })
      .catch((err) => {
        console.log("err,to 404");
      });
    // console.log();
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <Heading size="md">{`Game box: ${params.game_id}`}</Heading>
        </CardHeader>

        <CardBody>
          <Text>{`Player 1: ${game?.player_one?.play_address}`}</Text>
          <Text>{`Player 2: ${game?.player_two?.play_address}`}</Text>
        </CardBody>
        <CardFooter>
          {game &&
            (game.is_end ? (
              <GameEnd />
            ) : new Date().getTime() < game.expiration_timestamp_in_seconds ? (
              check_is_player(accountId, game) ? (
                check_stage(accountId, game)
              ) : (
                <Text>Is Not Player</Text>
              )
            ) : (
              <Expiration />
            ))}
        </CardFooter>
      </Card>
    </>
  );
}
