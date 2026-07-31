window.ASSET_PASSPORT_CONFIG = {
  chain: {
    chainId: "0x164ce",
    chainName: "GIWA Sepolia",
    nativeCurrency: { name: "Test ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia-rpc.giwa.io"],
    blockExplorerUrls: ["https://sepolia-explorer.giwa.io"],
  },
  // GIWA Sepolia test-only controller. The UI never stores a private key; only its owner wallet can execute.
  controllerAddress: "0x4fbD9a0458930A76d6ceCf3B572A093dD9E3dc5f",
};
