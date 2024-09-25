
import { ethers } from "hardhat";
import * as contracts from './../ignition/deployments/chain-31337/deployed_addresses.json';
import { adminData } from "./adminData";

async function main() {
    const RwaToken = await ethers.getContractFactory("RwaToken");
    const rwaToken = RwaToken.attach(contracts['RwaTokenModule#RwaToken']);

    const baseURI =
        //'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Sequoiadendron_giganteum_at_Kenilworth_Castle.jpg/600px-Sequoiadendron_giganteum_at_Kenilworth_Castle.jpg'
        // 'https://u-news.com.ua/uploads/posts/2024-09/chym-garne-zhyto-yak-syderat-voseny.webp'// "ipfs://QmTRxBoLapSUgAiaz2FxvQYW2ektgJnhoomzaQ8Q76puvA"
        'https://upload.wikimedia.org/wikipedia/commons/b/b9/Picea_abies1.JPG'
    //Address you want to mint your NFT to
    const to = adminData.adminAddress;
    // Mint token
    const tx = await rwaToken.mint(to, baseURI);
    const receipt = await tx.wait();

    // Log the transaction details
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.cumulativeGasUsed);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

