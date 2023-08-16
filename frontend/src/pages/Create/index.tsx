import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { utils } from "near-api-js";
import { useWalletSelector } from "../../contexts/WalletSelectorContext.tsx";
import { useEffect } from "react";

const BOATLOAD_OF_GAS = utils.format.parseNearAmount("0.00000000003")!;

export function Create() {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();
  const { selector, modal, accountId } = useWalletSelector();

  useEffect(() => {
    if (!accountId) modal.show();
  }, []);

  async function onCreateGame(values: any) {
    const wallet = await selector.wallet();
    await wallet.signAndSendTransaction({
      signerId: accountId!,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "create_game",
            args: {
              player_one_address: values.player_one_address,
              player_two_address: values.player_two_address,
            },
            gas: BOATLOAD_OF_GAS,
            deposit: utils.format.parseNearAmount("0.1")!,
          },
        },
      ],
    });
  }

  return (
    <>
      {accountId ? (
        <Card>
          <CardHeader>
            <Heading size="md">{`Create A New Game`}</Heading>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit(onCreateGame)}>
              <FormControl isInvalid={Boolean(errors.player_one_address)}>
                <FormLabel htmlFor="player_one_address">
                  Player One Address
                </FormLabel>
                <Input
                  id="player_one_address"
                  {...register("player_one_address", {
                    required: true,
                  })}
                />
              </FormControl>

              <FormControl isInvalid={Boolean(errors.player_two_address)}>
                <FormLabel htmlFor="player_two_address">
                  Player Two Address
                </FormLabel>
                <Input
                  id="player_two_address"
                  {...register("player_two_address", {
                    required: true,
                  })}
                />
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
          </CardBody>
          <CardFooter></CardFooter>
        </Card>
      ) : (
        <Text>Please Connect Wallet</Text>
      )}
    </>
  );
}
