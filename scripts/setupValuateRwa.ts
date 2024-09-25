import * as contracts from './../ignition/deployments/chain-31337/deployed_addresses.json';
import { ethers } from "hardhat";
import { generateKeyPair } from './forge';
import * as fs from 'fs';
import * as path from 'path';
import { adminData, tokenIdToWork } from './adminData';

async function main() {
    console.log('contracts :>>', contracts['RwaValuationModule#RwaValuation']);
    const RwaValuation = await ethers.getContractFactory("RwaValuation");
    const rwaValuation = RwaValuation.attach(contracts['RwaValuationModule#RwaValuation']);
    const tokenId = tokenIdToWork;
    const secretCred = generateKeyPair();

    // Define the directory and file path
    const keysDirectory = path.join(__dirname, 'keys');
    const keyFileName = path.join(keysDirectory, `keys${tokenId}.json`);

    // Ensure the directory exists
    if (!fs.existsSync(keysDirectory)) {
        fs.mkdirSync(keysDirectory, { recursive: true });
    }

    // Save the key pair to the file
    fs.writeFileSync(keyFileName, JSON.stringify(secretCred, null, 2));
    console.log(`Key pair saved to ${keyFileName}`);

    console.log("🚀 ~ main ~ secretCred:", secretCred);
    const signer = await ethers.getSigner(adminData.adminAddress);
    console.log('secretCred.publicKey  before:>>', secretCred.publicKey);
    const tx = await rwaValuation.connect(signer)['setUpRwaToValuate'](tokenId, secretCred.publicKey, contracts['RwaTokenModule#RwaToken']);

    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.hash);

    const valuation = await rwaValuation.connect(signer).getValuation(tokenId, contracts['RwaTokenModule#RwaToken']);
    console.log("🚀 ~ main ~ valuation:", valuation);
    console.log("Gas used:", receipt.cumulativeGasUsed.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});