import { useWalletSelector } from "../../contexts/WalletSelectorContext.tsx";
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
} from "@chakra-ui/react";
import copy from "copy-to-clipboard";
import { ChevronDownIcon } from "@chakra-ui/icons";

export function NavBar() {
  const { selector, modal, accountId } = useWalletSelector();

  return (
    <>
      <Flex
        minWidth="max-content"
        height={"75px"}
        backgroundColor={"gray.50"}
        alignItems="center"
        gap="2"
      >
        <Box p="2">
          <Heading size="lg" color={"green"}>
            <a href={"/"}>Split Or Steal</a>
          </Heading>
        </Box>
        <Spacer />
        <Button>
          <a href={"/create"}>Create Game</a>
        </Button>
        <Menu colorScheme={"green"}>
          {accountId ? (
            <MenuButton
              as={Button}
              borderRadius={"30px"}
              fontWeight={"600"}
              rightIcon={<ChevronDownIcon />}
            >
              {`${
                accountId.length > 10
                  ? `${accountId.slice(0, 5)}...${accountId.slice(-5)}`
                  : accountId
              }`}
            </MenuButton>
          ) : (
            <MenuButton
              as={Button}
              fontWeight={"600"}
              borderRadius={"30px"}
              onClick={() => {
                modal.show();
              }}
            >
              Connect Wallet
            </MenuButton>
          )}
          {accountId ? (
            <MenuList fontWeight={"600"} maxWidth={"sm"}>
              <MenuItem
                display={"flex"}
                justifyContent={"space-between"}
                onClick={() => {
                  copy(accountId);
                }}
              >
                <span>{`${
                  accountId.length > 10
                    ? `${accountId.slice(0, 5)}...${accountId.slice(-5)}`
                    : accountId
                }`}</span>
                <Icon></Icon>{" "}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  selector
                    .wallet()
                    .then((wallet) => {
                      wallet.signOut().catch((err) => {
                        console.log("Failed to sign out");
                        console.error(err);
                      });
                    })
                    .catch((err) => {
                      console.log("Failed to sign out");
                      console.error(err);
                    });
                }}
              >
                Disconnect
              </MenuItem>
            </MenuList>
          ) : null}
        </Menu>
      </Flex>
    </>
  );
}
