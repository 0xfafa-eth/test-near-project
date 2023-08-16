import { useEffect, useState } from "react";
import { useWalletSelector } from "../../contexts/WalletSelectorContext.tsx";
import { providers } from "near-api-js";
import { CONTRACT_ID } from "../../constants";
import { Buffer } from "buffer";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Heading,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { Game } from "../../type";
import { useNavigate } from "react-router-dom";

export function Hero() {
  const { selector, modal, accountId } = useWalletSelector();
  const [list, SetList] = useState<Array<Game>>([]);
  const navigate = useNavigate();
  useEffect(() => {
    const provider = new providers.JsonRpcProvider({
      url: selector.options.network.nodeUrl,
    });
    provider
      .query({
        request_type: "call_function",
        account_id: CONTRACT_ID,
        method_name: "get_latest_some_games",
        args_base64: Buffer.from(JSON.stringify({ amount: "10" })).toString(
          "base64",
        ),
        finality: "optimistic",
      })
      .then((res: any) => {
        const i: Array<never> = JSON.parse(Buffer.from(res.result).toString());
        const vec_id = i[0];
        const vec_game: Array<never> = i[1];

        SetList(
          vec_game.map((value: { game_id: never }, index: string | number) => {
            value.game_id = vec_id[index];
            return value;
          }) as any,
        );
      });
  }, []);

  function get_status(item: Game) {
    if (item.is_end) {
      return "This Game is End";
    } else if (new Date().getTime() > item.expiration_timestamp_in_seconds) {
      return "This Game is Expiration";
    } else {
      return "Wait Play";
    }
  }

  return (
    <>
      <SimpleGrid
        spacing={4}
        templateColumns="repeat(auto-fill, minmax(240px, 1fr))"
      >
        {list.map((item, index) => {
          return (
            <Card key={index}>
              <CardHeader>
                <Heading size="md">{`Game box: ${item?.game_id}`}</Heading>
              </CardHeader>
              <CardBody>
                <Text>{`Player 1: ${item?.player_one.play_address}`}</Text>
                <Text>{`Player 2: ${item?.player_two.play_address}`}</Text>

                <Text marginTop={"20px"} color={"Red"}>{`${get_status(
                  item,
                )}`}</Text>
              </CardBody>
              <CardFooter>
                <Button
                  onClick={() => {
                    navigate(`/playground/${item.game_id}`);
                  }}
                >
                  View here
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </SimpleGrid>
      {/*<Tabs isLazy>*/}
      {/*  <TabList>*/}
      {/*    <Tab>Create Game</Tab>*/}
      {/*    <Tab>Submit Decision</Tab>*/}
      {/*    <Tab>Reveal Decision</Tab>*/}
      {/*  </TabList>*/}
      {/*  <TabPanels>*/}
      {/*    <TabPanel>*/}
      {/*      <p>one!</p>*/}
      {/*    </TabPanel>*/}
      {/*    <TabPanel>*/}
      {/*      <p>two!</p>*/}
      {/*    </TabPanel>*/}
      {/*  </TabPanels>*/}
      {/*</Tabs>*/}
    </>
  );
}
