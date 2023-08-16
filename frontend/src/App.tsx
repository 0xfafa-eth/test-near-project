import { WalletSelectorContextProvider } from "./contexts/WalletSelectorContext.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { ChakraProvider } from "@chakra-ui/react";
import { Hero } from "./pages/Hero";
import { Playground } from "./pages/Playground";
import { Create } from "./pages/Create";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Hero />,
  },
  {
    path: "/playground/:game_id",
    element: <Playground />,
  },
  {
    path: "/create",
    element: <Create />,
  },
]);

function App() {
  return (
    <>
      <ChakraProvider>
        <WalletSelectorContextProvider>
          <NavBar />

          <RouterProvider router={router} />
        </WalletSelectorContextProvider>
      </ChakraProvider>
    </>
  );
}

export default App;
