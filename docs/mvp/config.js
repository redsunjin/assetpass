window.ASSET_PASSPORT_CONFIG = {
  chain: {
    chainId: "0x164ce",
    chainName: "GIWA Sepolia",
    nativeCurrency: { name: "Test ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia-rpc.giwa.io"],
    blockExplorerUrls: ["https://sepolia-explorer.giwa.io"],
  },
  // Set after the tested GIWA deployment. The UI never stores a private key and only the connected wallet can execute.
  controllerAddress: "",
};
