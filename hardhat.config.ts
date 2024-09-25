import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require('dotenv').config();



const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    localhost: {},
    testnet: {
      url: `https://a.sentry.testnet.kiivalidator.com:8645/`,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY as string],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.SEPOLIA_INFURA_KEY}`,
      accounts: [process.env.SEPOLIA_PK as string],
    },
  },
};

export default config;
